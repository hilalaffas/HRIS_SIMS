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
 * Pembatas laju request untuk endpoint publik yang rawan disalahgunakan:
 *  - POST /api/auth/login                       : brute-force / credential stuffing
 *  - POST /api/password-reset/forgot-password   : spam notifikasi ke HRD
 *
 * [UBAH] Login memakai DUA lapis:
 *  1. Batas lonjakan  : total request login per IP per menit (anti-flood, semua request dihitung).
 *  2. Batas kegagalan : hanya login GAGAL (401/403) yang dihitung per IP dalam 10 menit.
 *     Login BERHASIL mereset hitungan kegagalan IP tersebut, jadi banyak karyawan yang
 *     login normal dari satu jaringan kantor (satu IP publik) tidak saling memblokir.
 *  Penguncian per akun (3x salah password) tetap ditangani AuthController.
 *
 * Fixed-window counter di memori (tanpa dependency baru), cukup untuk 1 instance backend.
 * Bila nanti scale ke >1 instance, pindahkan ke Redis atau pasang rate limit di proxy/WAF.
 *
 * [BARU] IP klien dibaca dari header proxy (lihat resolveClientIp), bukan getRemoteAddr()
 * saja, karena di belakang proxy Render getRemoteAddr() bisa berisi IP proxy yang sama
 * untuk semua pengguna (semua orang berbagi satu jatah).
 *
 * Catatan: tantangan/429 dari Cloudflare milik Render terjadi SEBELUM request sampai
 * ke aplikasi ini dan tidak bisa diatur dari kode.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String LOGIN_PATH = "/api/auth/login";
    private static final String FORGOT_PATH = "/api/password-reset/forgot-password";
    private static final int CLEANUP_THRESHOLD = 10_000;
    private static final int MAX_TRACKED_KEYS = 50_000;
    private static final int MAX_IP_LENGTH = 45;

    private record Rule(int maxRequests, long windowMillis) {
    }

    private static final class Window {
        volatile long expiresAt;
        volatile int count;
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final boolean enabled;
    private final String clientIpHeader;
    private final Rule loginBurstPerIp;
    private final Rule loginFailurePerIp;
    private final Rule forgotPerIp;
    private final Rule forgotGlobal;

    public RateLimitFilter(
            @Value("${ratelimit.enabled:true}") boolean enabled,
            @Value("${ratelimit.client-ip-header:CF-Connecting-IP}") String clientIpHeader,
            @Value("${ratelimit.login.max-per-minute:30}") int loginBurstMax,
            @Value("${ratelimit.login.max-failures-per-10-minutes:15}") int loginFailureMax,
            @Value("${ratelimit.forgot-password.max-per-10-minutes:5}") int forgotMax,
            @Value("${ratelimit.forgot-password.global-max-per-10-minutes:40}") int forgotGlobalMax) {
        this.enabled = enabled;
        this.clientIpHeader = clientIpHeader == null ? "" : clientIpHeader.trim();
        this.loginBurstPerIp = new Rule(loginBurstMax, 60_000L);
        this.loginFailurePerIp = new Rule(loginFailureMax, 600_000L);
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

        String ip = resolveClientIp(request);

        if (LOGIN_PATH.equals(request.getRequestURI())) {
            handleLogin(ip, request, response, filterChain);
        } else {
            handleForgotPassword(ip, request, response, filterChain);
        }
    }

    private void handleLogin(String ip, HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String failureKey = "login-fail|" + ip;

        long retryAfterSeconds = Math.max(
                consume("login-burst|" + ip, loginBurstPerIp),
                blockedSeconds(failureKey, loginFailurePerIp));
        if (retryAfterSeconds > 0) {
            rejectTooManyRequests(response, retryAfterSeconds);
            return;
        }

        filterChain.doFilter(request, response);

        // Hasil login menentukan hitungan: sukses -> reset, gagal kredensial -> tambah.
        int status = response.getStatus();
        if (status >= 200 && status < 300) {
            windows.remove(failureKey);
        } else if (status == HttpServletResponse.SC_UNAUTHORIZED
                || status == HttpServletResponse.SC_FORBIDDEN) {
            consume(failureKey, loginFailurePerIp);
        }
    }

    private void handleForgotPassword(String ip, HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        long retryAfterSeconds = Math.max(
                consume("forgot|" + ip, forgotPerIp),
                consume("forgot|*", forgotGlobal));
        if (retryAfterSeconds > 0) {
            rejectTooManyRequests(response, retryAfterSeconds);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private void rejectTooManyRequests(HttpServletResponse response, long retryAfterSeconds)
            throws IOException {
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"errorCode\":\"TOO_MANY_REQUESTS\","
                + "\"message\":\"Terlalu banyak percobaan. Silakan coba lagi dalam "
                + formatWaitTime(retryAfterSeconds) + ".\","
                + "\"retryAfterSeconds\":" + retryAfterSeconds + "}");
    }

    private static String formatWaitTime(long seconds) {
        return seconds < 60 ? seconds + " detik" : ((seconds + 59) / 60) + " menit";
    }

    /**
     * Urutan sumber IP klien:
     *  1. header yang dikonfigurasi (default CF-Connecting-IP; Cloudflare menimpanya sendiri),
     *  2. entri pertama X-Forwarded-For,
     *  3. getRemoteAddr().
     * Nilai yang bentuknya tidak mirip IP dibuang supaya header sembarang tidak
     * menggembungkan memori. Header proxy masih bisa dipalsukan bila request menembus proxy
     * tanpa Cloudflare; karena itu penguncian per akun tetap jadi pertahanan utama.
     */
    private String resolveClientIp(HttpServletRequest request) {
        String candidate = null;
        if (!clientIpHeader.isEmpty()) {
            candidate = firstValue(request.getHeader(clientIpHeader));
        }
        if (!isValidIp(candidate)) {
            candidate = firstValue(request.getHeader("X-Forwarded-For"));
        }
        if (!isValidIp(candidate)) {
            candidate = request.getRemoteAddr();
        }
        return candidate == null ? "unknown" : candidate;
    }

    private static String firstValue(String headerValue) {
        if (headerValue == null) {
            return null;
        }
        int comma = headerValue.indexOf(',');
        return (comma >= 0 ? headerValue.substring(0, comma) : headerValue).trim();
    }

    private static boolean isValidIp(String value) {
        if (value == null || value.isEmpty() || value.length() > MAX_IP_LENGTH) {
            return false;
        }
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            boolean allowed = (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')
                    || (c >= 'A' && c <= 'F') || c == '.' || c == ':';
            if (!allowed) {
                return false;
            }
        }
        return true;
    }

    /** Hitung satu request; @return 0 bila diizinkan, atau sisa detik sampai jendela waktu berikutnya bila ditolak. */
    private long consume(String key, Rule rule) {
        long now = System.currentTimeMillis();
        cleanupIfNeeded(now);
        if (windows.size() >= MAX_TRACKED_KEYS && !windows.containsKey(key)) {
            return 0; // memori penuh: lebih baik melonggarkan daripada menumbuhkan map tanpa batas
        }
        long[] retryAfter = {0};
        windows.compute(key, (k, current) -> {
            Window window = current;
            if (window == null || now >= window.expiresAt) {
                window = new Window();
                window.expiresAt = now + rule.windowMillis();
            }
            window.count++;
            if (window.count > rule.maxRequests()) {
                retryAfter[0] = secondsUntil(window.expiresAt, now);
            }
            return window;
        });
        return retryAfter[0];
    }

    /** Cek tanpa menambah hitungan; @return sisa detik bila jatah kegagalan sudah habis, selain itu 0. */
    private long blockedSeconds(String key, Rule rule) {
        long now = System.currentTimeMillis();
        Window window = windows.get(key);
        if (window == null || now >= window.expiresAt || window.count < rule.maxRequests()) {
            return 0;
        }
        return secondsUntil(window.expiresAt, now);
    }

    private static long secondsUntil(long expiresAt, long now) {
        return Math.max(1, (expiresAt - now + 999) / 1000);
    }

    private void cleanupIfNeeded(long now) {
        if (windows.size() > CLEANUP_THRESHOLD) {
            windows.entrySet().removeIf(e -> now >= e.getValue().expiresAt);
        }
    }
}
