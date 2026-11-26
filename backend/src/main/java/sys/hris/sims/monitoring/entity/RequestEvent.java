package sys.hris.sims.monitoring.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// [BARU] Satu baris = satu request HTTP yang layak dipantau (lihat V80 untuk aturan apa yang disimpan).
@Entity
@Table(name = "request_events")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long id;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "username", length = 50)
    private String username;

    @Column(name = "method", nullable = false, length = 10)
    private String method;

    // Pola route Spring (mis. /api/cuti/{id}) -- dipakai untuk mengelompokkan endpoint.
    @Column(name = "route", length = 200)
    private String route;

    // Path asli tanpa query string (mis. /api/cuti/12).
    @Column(name = "path", nullable = false, length = 300)
    private String path;

    @Column(name = "status", nullable = false)
    private int status;

    @Column(name = "duration_ms", nullable = false)
    private int durationMs;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "error_message", length = 400)
    private String errorMessage;
}
