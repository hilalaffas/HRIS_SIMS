package sys.hris.sims.leave.entity;

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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.leavestatus.entity.LeaveStatus;
import sys.hris.sims.leavetype.entity.LeaveType;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "leave_requests")
public class LeaveRequest {

    @Builder.Default
    @jakarta.persistence.ElementCollection(fetch = jakarta.persistence.FetchType.EAGER)
    @jakarta.persistence.CollectionTable(name="leave_day_cancellations", joinColumns=@JoinColumn(name="leave_request_id"))
    @org.hibernate.annotations.BatchSize(size=50)
    @jakarta.persistence.OrderBy("date ASC")
    @com.fasterxml.jackson.annotation.JsonProperty(access=com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private java.util.List<LeaveDayCancellation> cancellations = new java.util.ArrayList<>();

    // Constructors/builders may explicitly supply null. Consumers run before
    // @PrePersist as well, so the collection must be safe at read time.
    public java.util.List<LeaveDayCancellation> getCancellations() {
        if (cancellations == null) cancellations = new java.util.ArrayList<>();
        return cancellations;
    }

    public void setCancellations(java.util.List<LeaveDayCancellation> value) {
        // Preserve Hibernate's managed collection when a non-null value is supplied.
        cancellations = value == null ? new java.util.ArrayList<>() : value;
    }

    public boolean cancelledOn(LocalDate date) { return getCancellations().stream().anyMatch(c -> date.equals(c.getDate())); }
    @Transient
    public BigDecimal getOriginalTotalDays() {
        return (totalDays == null ? BigDecimal.ZERO : totalDays).add(getCancellations().stream().map(LeaveDayCancellation::getDays).reduce(BigDecimal.ZERO,BigDecimal::add));
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leave_request_id")
    private Long leaveRequestId;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne
    @JoinColumn(name = "status_id", nullable = false)
    private LeaveStatus status;

    @ManyToOne
    @JoinColumn(name = "leave_type_id", nullable = false)
    private LeaveType leaveType;

    @ManyToOne
    @JoinColumn(name = "reviewed_by")
    private Employee reviewedBy;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "total_days", nullable = false)
    private BigDecimal totalDays;

    // Jumlah hari dari pengajuan ini yang benar-benar memakai Sisa Cuti
    // (lama/manual). Nilai ini disimpan saat pengajuan menjadi APPROVED agar
    // histori lama tidak dihitung ulang ketika HR mengisi/mengubah saldo manual.
    @Column(name = "manual_leave_days", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal manualLeaveDays = BigDecimal.ZERO;

    // [BARU] Sesi untuk Cuti setengah hari: "PAGI" atau "SIANG".
    // NULL untuk jenis cuti lain. Diisi & divalidasi di
    // LeaveService.calculateLeaveDays().
    @Column(name = "session")
    private String session;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;
    
    @Column(name = "review_note")
    private String reviewNote;

    @Column(name = "reason")
    private String reason;

    @Column(name = "pending_work")
    private String pendingWork;

    // [BARU V56] TRUE = catatan hasil import riwayat (ledger lama, satu baris per tanggal).
    // Tidak ikut perhitungan saldo (LeaveService.getLeaveBalance), hanya riwayat/laporan/bentrok.
    @Builder.Default
    @Column(name = "is_imported_history", nullable = false)
    private Boolean importedHistory = false;

    @Column(name = "covered_by")
    private String coveredBy;

    @Transient
    private Long leaderEmployeeId;

    @Transient
    private Long spvEmployeeId;

    @Transient
    private Long managerEmployeeId;

    // [BARU] Approver HRD yang dipilih pemohon (satu nama). Menggantikan leader/spv/manager
    // untuk pengajuan baru; tiga field di atas dipertahankan hanya agar klien lama tidak error.
    @Transient
    private Long hrdEmployeeId;

    @PrePersist
    public void prePersist() {
        this.submittedAt = LocalDateTime.now();
        applyDefaults(); // [BARU]
    }

    // [BARU] Penjaga terakhir sebelum UPDATE: field NOT NULL tidak boleh jadi null lewat setter/JSON.
    @PreUpdate
    public void preUpdate() {
        applyDefaults();
    }

    // [BARU] Field NOT NULL yang nilai awalnya bisa hilang (constructor/JSON/builder) diisi default di sini,
    // sehingga INSERT/UPDATE tidak pernah melanggar constraint is_imported_history (V56).
    private void applyDefaults() {
        if (cancellations == null) cancellations = new java.util.ArrayList<>();
        if (this.importedHistory == null) {
            this.importedHistory = false;
        }
    }
}
