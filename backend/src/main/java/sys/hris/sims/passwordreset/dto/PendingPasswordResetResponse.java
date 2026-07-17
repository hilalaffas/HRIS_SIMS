package sys.hris.sims.passwordreset.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * [BARU] DTO khusus untuk daftar permintaan reset password yang PENDING
 * (dipakai oleh lonceng notifikasi HR Admin).
 *
 * Berbeda dari PasswordResetResponse (dipakai saat karyawan submit form Lupa
 * Sandi), DTO ini SENGAJA ditambah field employeeId, employeeName, position,
 * dan divisiName -- supaya begitu HR klik notifikasi lalu klik "Proses",
 * frontend punya employeeId untuk langsung membuka baris karyawan yang tepat
 * di halaman /karyawan tanpa perlu request tambahan.
 *
 * Sebelumnya endpoint GET /api/password-reset/pending mengembalikan entity
 * PasswordResetRequest mentah (tanpa employeeId sama sekali), jadi frontend
 * tidak punya cara untuk tahu baris karyawan mana yang harus dibuka.
 */
@Data
@Builder
@AllArgsConstructor
public class PendingPasswordResetResponse {

    private Long id;               // id baris password_reset_requests
    private Long userId;           // users.user_id
    private String username;
    private String email;

    // Bisa null kalau (secara data) user belum punya baris di tabel employees.
    private Long employeeId;
    private String employeeName;
    private String position;
    private String divisiName;

    private LocalDateTime requestedAt;
}
