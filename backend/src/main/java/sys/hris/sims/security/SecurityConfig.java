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
                        .requestMatchers(HttpMethod.GET, "/api/karyawan/**")
                        .hasAnyRole(ADMIN_ROLES)

                        .requestMatchers(HttpMethod.POST, "/api/karyawan")
                        .hasAnyRole(ADMIN_ROLES)

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

                        .requestMatchers(HttpMethod.GET,
                                "/api/cuti/approvals/**")
                        .hasAnyRole(APPROVER_ROLES)

                        .requestMatchers(HttpMethod.GET,
                                "/api/cuti/**")
                        .hasAnyRole(
                                "ADMIN",
                                "HRD_ADMIN",
                                "SUPER_ADMIN",
                                "LEADER",
                                "SPV",
                                "MANAGER")

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
                        .hasAnyRole("ADMIN", "HRD_ADMIN")

                        // ==========================
                        // Holiday
                        // ==========================
                        .requestMatchers(HttpMethod.GET, "/api/holidays/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/holidays").hasAnyRole(ADMIN_ROLES)
                        .requestMatchers(HttpMethod.PUT, "/api/holidays/**").hasAnyRole(ADMIN_ROLES)
                        .requestMatchers(HttpMethod.DELETE, "/api/holidays/**").hasAnyRole(ADMIN_ROLES)

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