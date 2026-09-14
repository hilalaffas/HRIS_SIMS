package sys.hris.sims.security;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * [BARU] Dipanggil Spring Security saat sebuah request menyentuh endpoint
 * yang butuh login TAPI tidak ada Authentication valid di SecurityContext --
 * ini terjadi kalau token tidak dikirim sama sekali, rusak/tidak valid,
 * ATAU sudah kedaluwarsa (JwtAuthFilter tidak membedakan ketiganya, dia
 * cukup tidak men-set Authentication kalau jwtService.validateToken() false).
 *
 * SEBELUM file ini ada: kasus di atas jatuh ke default Spring Security dan
 * bercampur dengan kasus "role tidak cukup" (lihat RestAccessDeniedHandler)
 * -- keduanya sama-sama balas HTTP 403 polos tanpa body yang bisa dibedakan,
 * jadi frontend TIDAK BISA tahu apakah harus suruh user login ulang atau
 * cukup tampilkan "tidak punya izin".
 *
 * SESUDAH: kasus ini SELALU balas 401 + errorCode SESSION_EXPIRED. Frontend
 * (src/services/api.js) memakai sinyal ini untuk memicu alur "sesi habis"
 * (modal + auto-redirect ke /login), TANPA salah tangkap kasus role-forbidden
 * sebagai sesi habis.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request,
                          HttpServletResponse response,
                          AuthenticationException authException) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        Map<String, String> body = new LinkedHashMap<>();
        body.put("errorCode", "SESSION_EXPIRED");
        body.put("message", "Sesi Anda telah berakhir demi keamanan. Silakan login kembali.");

        objectMapper.writeValue(response.getWriter(), body);
    }
}
