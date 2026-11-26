package sys.hris.sims.monitoring.filter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Set;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import sys.hris.sims.monitoring.entity.RequestEvent;
import sys.hris.sims.monitoring.service.RequestEventWriter;
import sys.hris.sims.monitoring.service.RequestMetrics;

/**
 * [BARU] Mengukur durasi dan status SETIAP request /api untuk panel Monitoring akun dev.
 *
 * Dipasang PALING AWAL di rantai Spring Security (SecurityConfig, sebelum RateLimitFilter) supaya
 * penolakan 401/403/429 dari filter keamanan ikut terukur. Username dibaca setelah rantai selesai;
 * konteks keamanan baru dibersihkan setelah filter ini kembali, jadi nama pengguna masih tersedia.
 *
 * Disimpan ke database hanya kejadian penting: request yang mengubah data, yang gagal (>= 400),
 * dan yang lambat. Semua request tetap masuk penghitung memori (RequestMetrics).
 * Yang TIDAK pernah dibaca/disimpan: body, query string, header Authorization, sandi.
 */
@Component
public class RequestMonitoringFilter extends OncePerRequestFilter {

    // Atribut yang diisi GlobalExceptionHandler dengan ringkasan pesan error.
    public static final String ERROR_ATTRIBUTE = "sims.monitor.error";

    private static final String API_PREFIX = "/api/";
    // Panel monitoring sendiri tidak dicatat, supaya memuat/menyegarkan panel tidak menambah data.
    private static final String MONITOR_PREFIX = "/api/dev/monitor";
    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final int MAX_PATH = 300;
    private static final int MAX_ROUTE = 200;
    private static final int MAX_USERNAME = 50;
    private static final int MAX_IP = 45;
    private static final int MAX_ERROR = 400;

    private final RequestMetrics metrics;
    private final RequestEventWriter writer;

    public RequestMonitoringFilter(RequestMetrics metrics, RequestEventWriter writer) {
        this.metrics = metrics;
        this.writer = writer;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null
                || !path.startsWith(API_PREFIX)
                || path.startsWith(MONITOR_PREFIX)
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long startNanos = System.nanoTime();
        Throwable failure = null;
        try {
            chain.doFilter(request, response);
        } catch (ServletException | IOException | RuntimeException ex) {
            failure = ex;
            throw ex;
        } finally {
            try {
                record(request, response, failure, (System.nanoTime() - startNanos) / 1_000_000L);
            } catch (Exception ignored) {
                // Pemantauan tidak boleh pernah mengganggu request.
            }
        }
    }

    private void record(HttpServletRequest request, HttpServletResponse response, Throwable failure, long durationMs) {
        String method = request.getMethod().toUpperCase();
        int status = failure != null && response.getStatus() < 400 ? 500 : response.getStatus();
        String route = routeOf(request);

        metrics.record(method, route, status, durationMs);

        boolean isWrite = WRITE_METHODS.contains(method);
        if (!isWrite && status < 400 && !metrics.isSlow(durationMs)) {
            return; // GET biasa yang sehat dan cepat: cukup masuk penghitung memori
        }

        String errorMessage = null;
        Object attribute = request.getAttribute(ERROR_ATTRIBUTE);
        if (attribute != null) {
            errorMessage = cut(attribute.toString(), MAX_ERROR);
        } else if (failure != null) {
            errorMessage = cut(failure.getClass().getSimpleName() + ": " + failure.getMessage(), MAX_ERROR);
        }

        writer.submit(RequestEvent.builder()
                .createdAt(LocalDateTime.now())
                .username(cut(usernameOf(), MAX_USERNAME))
                .method(cut(method, 10))
                .route(cut(route, MAX_ROUTE))
                .path(cut(request.getRequestURI(), MAX_PATH))
                .status(status)
                .durationMs((int) Math.min(durationMs, Integer.MAX_VALUE))
                .ipAddress(cut(clientIp(request), MAX_IP))
                .errorMessage(errorMessage)
                .build());
    }

    private String routeOf(HttpServletRequest request) {
        Object pattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        return pattern == null ? null : pattern.toString();
    }

    private String usernameOf() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }
        return authentication.getName();
    }

    // Hanya untuk tampilan monitoring (bukan keputusan keamanan), jadi header proxy boleh dipercaya.
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String cut(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
