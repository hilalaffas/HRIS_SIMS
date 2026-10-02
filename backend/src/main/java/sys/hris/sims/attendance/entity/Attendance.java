package sys.hris.sims.attendance.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import sys.hris.sims.employee.entity.Employee;

// [BARU] Entity absensi -- realisasi modul Absensi. Pola mengikuti
// LeaveRequest (leave/entity/LeaveRequest.java): @ManyToOne ke Employee,
// jam dicatat lewat @PrePersist di server (bukan dikirim client), dan
// field status berupa kode String (ON_TIME/LATE/DONE/SICK/IZIN) yang
// dihitung AttendanceService, bukan input mentah dari user.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "attendances")
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Long attendanceId;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    // 'MASUK' atau 'KELUAR'
    @Column(name = "action", nullable = false, length = 10)
    private String action;

    // 'ABSEN', 'SAKIT', atau 'IZIN'
    @Column(name = "reason", nullable = false, length = 10)
    private String reason;

    // Dihitung AttendanceService.resolveStatus() -- ON_TIME/LATE/DONE/SICK/IZIN
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "note")
    private String note;

    @Column(name = "photo_url", nullable = false, length = 500)
    private String photoUrl;

    @Column(name = "latitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", nullable = false, precision = 11, scale = 7)
    private BigDecimal longitude;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // [BARU] 'NOT_REQUIRED' (absensi biasa), atau untuk reason SAKIT:
    // 'PENDING' -> 'APPROVED' / 'REJECTED' (diputuskan SuperAdmin).
    @Column(name = "approval_status", nullable = false, length = 20)
    private String approvalStatus;

    // [BARU] Jam & tanggal SELALU diisi di sini (server), tidak pernah
    // diterima dari request client -- lihat AttendanceSubmitRequest yang
    // sengaja TIDAK punya field jam/tanggal sama sekali.
    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.recordedAt = now;
        this.attendanceDate = now.toLocalDate();
        this.createdAt = now;
        if (this.approvalStatus == null) {
            this.approvalStatus = "NOT_REQUIRED";
        }
    }
}
