package sys.hris.sims.security;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * [BARU] Pembatas laju request untuk endpoint publik yang rawan disalahgunakan:
 *  - POST /api/auth/login                       : brute-force / credential stuffing
 *  - POST /api/password-reset/forgot-password   : spam notifikasi ke HRD
 *
 * Fixed-window counter di memori (tanpa dependency baru). Cukup untuk 1 instance
 * backend (Railway). Bila nanti scale ke >1 instance, pindahkan ke Redis atau
 * pasang rate limit di proxy/WAF.
 *
 * Catatan IP: memakai getRemoteAddr(); server.forward-headers-strategy=framework
 * sudah menerjemahkan X-Forwarded-For dari proxy Railway. Untuk forgot-password
 * ada tambahan batas GLOBAL, karena header X-Forwarded-For bisa dipalsukan penyerang
 * untuk berganti-ganti IP.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String LOGIN_PATH = "/api/auth/login";
    private static final String FORGOT_PATH = "/api/password-reset/forgot-password";
    private static final int CLEANUP_THRESHOLD = 10_000;

    private record Rule(int maxRequests, long windowMillis) {
    }

    private static final class Window {
        long startedAt;
        int count;
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final boolean enabled;
    private final Rule loginPerIp;
    private final Rule forgotPerIp;
    private final Rule forgotGlobal;

    public RateLimitFilter(
            @Value("${ratelimit.enabled:true}") boolean enabled,
            @Value("${ratelimit.login.max-per-minute:10}") int loginMax,
            @Value("${ratelimit.forgot-password.max-per-10-minutes:5}") int forgotMax,
            @Value("${ratelimit.forgot-password.global-max-per-10-minutes:40}") int forgotGlobalMax) {
        this.enabled = enabled;
        this.loginPerIp = new Rule(loginMax, 60_000L);
        this.forgotPerIp = new Rule(forgotMax, 600_000L);
        this.forgotGlobal = new Rule(forgotGlobalMax, 600_000L);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!enabled || !HttpMethod.POST.matches(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        return !LOGIN_PATH.equals(path) && !FORGOT_PATH.equals(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String ip = request.getRemoteAddr();

        long retryAfterSeconds = 0;
        if (LOGIN_PATH.equals(path)) {
            retryAfterSeconds = consume(path + "|" + ip, loginPerIp);
        } else {
            retryAfterSeconds = Math.max(
                    consume(path + "|" + ip, forgotPerIp),
                    consume(path + "|*", forgotGlobal));
        }

        if (retryAfterSeconds > 0) {
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(
                    "{\"errorCode\":\"TOO_MANY_REQUESTS\",\"message\":\"Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    /** @return 0 bila diizinkan, atau sisa detik sampai jendela waktu berikutnya bila ditolak. */
    private long consume(String key, Rule rule) {
        long now = System.currentTimeMillis();
        if (windows.size() > CLEANUP_THRESHOLD) {
            windows.entrySet().removeIf(e -> now - e.getValue().startedAt > 600_000L);
        }
        long[] retryAfter = {0};
        windows.compute(key, (k, current) -> {
            Window window = current;
            if (window == null || now - window.startedAt >= rule.windowMillis()) {
                window = new Window();
                window.startedAt = now;
            }
            window.count++;
            if (window.count > rule.maxRequests()) {
                retryAfter[0] = Math.max(1, (window.startedAt + rule.windowMillis() - now) / 1000);
            }
            return window;
        });
        return retryAfter[0];
    }
}
