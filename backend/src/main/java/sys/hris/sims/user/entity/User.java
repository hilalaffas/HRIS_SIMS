package sys.hris.sims.user.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import sys.hris.sims.role.entity.Roles;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    @ManyToOne
    @JoinColumn(name = "role_id", nullable = false)
    private Roles roleId;

    @Column(name = "username", nullable = false, length = 50, unique = true)
    private String username;

    // [PERBAIKAN KEAMANAN] Tanpa @JsonIgnore, hash password ikut terkirim
    // ke frontend setiap kali endpoint mengembalikan Employee/User (mis. GET
    // /api/karyawan mengembalikan employee.user.password). @JsonIgnore
    // membuat field ini tidak pernah ikut di-serialize ke JSON response,
    // tapi tetap bisa dibaca/ditulis dari kode Java & database seperti biasa.
    @JsonIgnore
    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "email")
    private String email;

    @Column(name = "failed_attempts", nullable = false)
    private Integer failedAttempts = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}