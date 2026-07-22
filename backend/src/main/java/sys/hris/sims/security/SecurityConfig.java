package sys.hris.sims.security;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    private static final String[] ADMIN_ROLES = {
            "ADMIN",
            "HRD_ADMIN",
            "SUPER_ADMIN"
    };

    private static final String[] APPROVER_ROLES = {
            "LEADER",
            "SPV",
            "MANAGER",
            "HRD_ADMIN",
            "SUPER_ADMIN"
    };

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(List.of("http://localhost:5173",
                                                "https://sims-gamma-three.vercel.app",
                                                "https://*.vercel.app",
                                                "https://*.ngrok-free.dev"));

        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS"
        ));

        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        return http
                .cors(cors -> {})
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth

                        // ==========================
                        // AUTH
                        // ==========================
                        .requestMatchers("/test", "/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/register").hasAnyRole(ADMIN_ROLES)
                        .requestMatchers("/api/roles").hasAnyRole(ADMIN_ROLES)
                        .requestMatchers("/api/emergency-contact-relationships").hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // PASSWORD RESET
                        // ==========================
                        .requestMatchers(HttpMethod.POST,
                                "/api/password-reset/forgot-password")
                        .permitAll()

                        .requestMatchers(HttpMethod.GET,
                                "/api/password-reset/pending")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.PUT,
                                "/api/password-reset/*/approve")
                        .hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // USER
                        // ==========================
                        .requestMatchers(HttpMethod.GET, "/api/users")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.PUT, "/api/users/**")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.DELETE, "/api/users/**")
                        .hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // EMPLOYEE
                        // ==========================
                        // PENTING: aturan /me ini harus di atas "GET /api/karyawan/**"
                        // di bawah, karena Spring Security mencocokkan berurutan dari
                        // atas — aturan pertama yang cocok yang dipakai. Kalau ini
                        // ditaruh di bawah, /me akan ikut ke-block hasAnyRole(ADMIN_ROLES).
                        .requestMatchers(HttpMethod.GET, "/api/karyawan/me")
                        .authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/karyawan/approvers")
                        .authenticated()
                        

                        .requestMatchers(HttpMethod.GET, "/api/karyawan/**")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.POST, "/api/karyawan")
                        .hasAnyRole(ADMIN_ROLES)

                        // PENTING: sama seperti GET /me, ini juga harus di atas
                        // "PUT /api/karyawan/**" di bawah supaya tidak ke-block ADMIN_ROLES.
                        .requestMatchers(HttpMethod.PUT, "/api/karyawan/me")
                        .authenticated()

                        .requestMatchers(HttpMethod.PUT, "/api/karyawan/**")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.DELETE, "/api/karyawan/**")
                        .hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // DIVISI
                        // ==========================
                        .requestMatchers(HttpMethod.GET, "/api/divisi/**")
                        .authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/divisi")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.PUT, "/api/divisi/**")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.DELETE, "/api/divisi/**")
                        .hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // LEAVE
                        // ==========================
                        .requestMatchers(HttpMethod.GET,
                                "/api/cuti/balance/me")
                        .authenticated()

                        .requestMatchers(HttpMethod.GET,
                                "/api/cuti/me")
                        .authenticated()

                        // [BARU] Endpoint exact-match ini HARUS ditaruh sebelum
                        // "/api/cuti/**" di bawah -- kalau tidak, request akan
                        // ketiban rule wildcard yang mensyaratkan role approver
                        // (LEADER/SPV/MANAGER/HR/Admin), padahal ini dipakai
                        // Member biasa untuk lihat riwayat approval cuti sendiri.
                        .requestMatchers(HttpMethod.GET,
                                "/api/cuti/me/approval-timeline")
                        .authenticated()

                        .requestMatchers(HttpMethod.GET,
                                "/api/cuti/approvals/**")
                        .hasAnyRole(APPROVER_ROLES)

                        .requestMatchers(HttpMethod.GET,
                                "/api/cuti/calendar")
                        .authenticated()

                        .requestMatchers(HttpMethod.GET,
                                "/api/cuti/**")
                        .hasAnyRole(
                                "ADMIN",
                                "HRD_ADMIN",
                                "SUPER_ADMIN",
                                "LEADER",
                                "SPV",
                                "MANAGER")

                        // [BARU] Cuti darurat/susulan yang diinput HR/Super Admin atas nama
                        // karyawan lain (auto-ACC) — HARUS ditaruh SEBELUM aturan
                        // "POST /api/cuti" di bawah supaya tidak ketiban .authenticated()
                        // yang lebih longgar (walau path-nya beda, urutan tetap dijaga
                        // biar konsisten dengan pola di file ini).
                        .requestMatchers(HttpMethod.POST,
                                "/api/cuti/urgent")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.POST,
                                "/api/cuti")
                        .authenticated()

                        .requestMatchers(HttpMethod.PUT,
                                "/api/cuti/*/approve")
                        .hasAnyRole(APPROVER_ROLES)

                        .requestMatchers(HttpMethod.PUT,
                                "/api/cuti/*/reject")
                        .hasAnyRole(APPROVER_ROLES)

                        .requestMatchers(HttpMethod.PUT,
                                "/api/cuti/*/return")
                        .hasAnyRole(APPROVER_ROLES)

                        .requestMatchers(HttpMethod.PUT,
                                "/api/cuti/*/resubmit")
                        .authenticated()
                        .requestMatchers(HttpMethod.DELETE,
                                "/api/cuti/**")
                        .hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // LEAVE TYPE
                        // ==========================
                        .requestMatchers(HttpMethod.GET,
                                "/api/jenis-cuti/**")
                        .authenticated()

                        .requestMatchers(HttpMethod.POST,
                                "/api/jenis-cuti")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.PUT,
                                "/api/jenis-cuti/**")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.DELETE,
                                "/api/jenis-cuti/**")
                        .hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // LEAVE STATUS
                        // ==========================
                        .requestMatchers(HttpMethod.GET,
                                "/api/status-cuti/**")
                        .authenticated()

                        .requestMatchers(HttpMethod.POST,
                                "/api/status-cuti")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.PUT,
                                "/api/status-cuti/**")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.DELETE,
                                "/api/status-cuti/**")
                        .hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // ACTIVITY LOG
                        // ==========================
                        .requestMatchers("/api/admin/**")
                        .hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // Holiday
                        // ==========================
                        .requestMatchers(HttpMethod.GET, "/api/holidays/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/holidays").hasAnyRole(ADMIN_ROLES)
                        .requestMatchers(HttpMethod.PUT, "/api/holidays/**").hasAnyRole(ADMIN_ROLES)
                        .requestMatchers(HttpMethod.DELETE, "/api/holidays/**").hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // News
                        // ==========================
                        .requestMatchers(HttpMethod.GET, "/api/news/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/news").hasAnyRole(ADMIN_ROLES)
                        .requestMatchers(HttpMethod.PUT, "/api/news/**").hasAnyRole(ADMIN_ROLES)
                        .requestMatchers(HttpMethod.DELETE, "/api/news/**").hasAnyRole(ADMIN_ROLES)

                        // ==========================
                        // SWAGGER
                        // ==========================
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/v3/api-docs/**")
                        .permitAll()

                        // ==========================
                        // UPLOADS (Akses File Foto)
                        // ==========================
                        .requestMatchers("/uploads/**").permitAll()

                        .anyRequest().authenticated()

                )

                .addFilterBefore(jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class)

                .build();
    }
}