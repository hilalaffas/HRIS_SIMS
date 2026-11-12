package sys.hris.sims.notification.entity;

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

// [BARU] Satu baris = satu notifikasi untuk satu penerima (users.user_id).
// `params` berisi JSON parameter teks (nama jenis cuti, tanggal, nama approver, dst)
// supaya frontend bisa merender teks sesuai bahasa aktif.
@Entity
@Table(name = "notifications")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "type", nullable = false, length = 40)
    private String type;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "params", columnDefinition = "TEXT")
    private String params;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;
}
