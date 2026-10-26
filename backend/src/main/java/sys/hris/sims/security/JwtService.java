package sys.hris.sims.security;

import java.security.Key;
import java.util.Date;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
    // [UBAH] Sebelumnya hardcoded di source code (bocor ke repo publik).
    // Sekarang dibaca dari env var JWT_SECRET. Nilai setelah ':' HANYA
    // fallback untuk development lokal -- production (Render) WAJIB
    // set env var JWT_SECRET sendiri dengan nilai baru yang dirotasi.
    @Value("${JWT_SECRET:local-dev-only-do-not-use-in-production-99d79c6f0315}")
    private String secret;

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final String DEV_SECRET_PREFIX = "local-dev-only-do-not-use-in-production";

    // [BARU] Fallback di atas tertulis di repo publik: siapa pun yang tahu nilainya bisa
    // memalsukan token (termasuk role SUPER_ADMIN). Peringatan keras di log saat server
    // berjalan dengan secret bawaan, supaya env var JWT_SECRET yang lupa diisi di produksi
    // langsung ketahuan.
    @PostConstruct
    void warnIfDevSecretInUse() {
        if (secret.startsWith(DEV_SECRET_PREFIX)) {
            log.warn("JWT_SECRET belum di-set: memakai secret DEV bawaan repo. JANGAN dipakai di produksi.");
        }
    }

    private Key getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String username, String role) {
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(getKey())
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser()
                .setSigningKey(getKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public String extractRole(String token) {   // <-- pastikan method ini ada
        return Jwts.parser().setSigningKey(getKey()).build()
                .parseClaimsJws(token).getBody().get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(getKey()).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}