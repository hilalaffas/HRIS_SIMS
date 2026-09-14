package sys.hris.sims.security;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * [BARU] Dipanggil Spring Security saat user SUDAH login dengan token yang
 * VALID, tapi role-nya tidak diizinkan mengakses endpoint tsb (mis. role
 * MEMBER coba hit endpoint khusus HR Admin). Ini kasus BERBEDA dari sesi
 * kedaluwarsa -- user tidak perlu login ulang, cukup diberi tahu aksesnya
 * ditolak. Lihat RestAuthenticationEntryPoint.java untuk kasus sesi habis.
 *
 * Kenapa dua kasus ini otomatis kepisah dengan benar (bukan cuma asumsi):
 * Spring Security punya ExceptionTranslationFilter yang mengecek apakah
 * Authentication saat ini "anonymous" (belum login sama sekali/token
 * invalid) -- kalau iya, request diarahkan ke AuthenticationEntryPoint
 * (401), BUKAN ke AccessDeniedHandler ini. Handler ini HANYA jalan kalau
 * user benar-benar sudah punya Authentication yang valid dari JwtAuthFilter.
 */
@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void handle(HttpServletRequest request,
                        HttpServletResponse response,
                        AccessDeniedException accessDeniedException) throws IOException {

        response.setStatus(HttpServletResponse.SC_FORBIDDEN); // 403
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        Map<String, String> body = new LinkedHashMap<>();
        body.put("errorCode", "FORBIDDEN");
        body.put("message", "Anda tidak memiliki izin untuk mengakses fitur ini.");

        objectMapper.writeValue(response.getWriter(), body);
    }
}
