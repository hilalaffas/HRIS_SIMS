package sys.hris.sims.employee.entity;

import jakarta.persistence.*;
import lombok.*;
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.user.entity.User;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime; // [BARU]

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_id")
    private Long employeeId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "divisi_id", nullable = false)
    private Divisi divisi;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "address")
    private String address;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "gender", nullable = false, columnDefinition = "bpchar(1)")
    private String gender;

    @Column(name = "join_date")
    private LocalDate joinDate;

    // [UBAH V30] Long -> String, dan insertable/updatable = false.
    // NIK sekarang otomatis dibuat oleh trigger di database (format
    // angka urut 4 digit tanpa awalan, contoh 0021 -- lihat V30 dan V58__nik_numeric_format.sql)
    // saat baris baru di-INSERT, jadi tidak boleh lagi diisi/diubah manual
    // dari sisi aplikasi (Java hanya baca nilainya, tidak pernah menulis).
    @Column(name = "nik_karyawan", insertable = false, updatable = false)
    private String nikKaryawan;

    @Column(name = "position", length = 100)
    private String position;

    @Column(name = "photo")
    private String photo;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @ManyToOne
    @JoinColumn(name = "emergency_contact_relationship_id")
    private EmergencyContactRelationship emergencyContactRelationship;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // [BARU] Kuota "Sisa Cuti" yang diisi manual oleh HR (menggantikan
    // field dummy "Sisa Cuti Sakit"). @Builder.Default WAJIB ada supaya
    // Employee.builder().build() tanpa isi field ini tetap default ke 0,
    // bukan null -- soalnya kolomnya NOT NULL di database.
    // [UBAH] Integer -> BigDecimal (V24__change_manual_leave_balance_to_decimal.sql)
    // supaya HR bisa isi alokasi awal dengan angka desimal bebas (mis. 2,25),
    // bukan cuma bilangan bulat. precision/scale WAJIB disamakan dengan
    // NUMERIC(6,2) di migration, karena ddl-auto=validate akan menolak start
    // up kalau definisi entity tidak cocok dengan kolom asli di database.
    @Builder.Default
    @Column(name = "manual_leave_balance", nullable = false, precision = 6, scale = 2)
    private BigDecimal manualLeaveBalance = BigDecimal.ZERO;

    // [BARU V55] Cuti tahunan yang sudah terpakai DI LUAR sistem (data manual sebelum SIMS
    // dipakai). Hanya berlaku untuk satu periode anniversary, yaitu yang dimulai pada
    // annualUsedOutsidePeriodStart; di periode lain nilainya diabaikan (lihat
    // LeaveService.getAnnualUsedOutsideSystem). Diisi dari halaman /devAccess.
    // precision/scale WAJIB sama dengan NUMERIC(6,2) di V55 (ddl-auto=validate).
    @Builder.Default
    @Column(name = "annual_used_outside_system", nullable = false, precision = 6, scale = 2)
    private BigDecimal annualUsedOutsideSystem = BigDecimal.ZERO;

    @Column(name = "annual_used_outside_period_start")
    private LocalDate annualUsedOutsidePeriodStart;

    // [BARU V64] Angka cuti hasil import Excel (ledger), disimpan apa adanya. Semua null = belum pernah
    // diimport -> Ringkasan Cuti dihitung sistem seperti biasa. precision/scale WAJIB sama dengan V64.
    @Column(name = "import_total_leave", precision = 6, scale = 2)
    private BigDecimal importTotalLeave;

    @Column(name = "import_used_leave", precision = 6, scale = 2)
    private BigDecimal importUsedLeave;

    @Column(name = "import_forfeited_leave", precision = 6, scale = 2)
    private BigDecimal importForfeitedLeave;

    @Column(name = "import_remaining_leave", precision = 6, scale = 2)
    private BigDecimal importRemainingLeave;

    // Waktu import. Cuti baru yang disetujui SETELAH waktu ini memakai logika sistem di atas angka Excel.
    @Column(name = "leave_import_baseline_at")
    private LocalDateTime leaveImportBaselineAt;

    // [BARU] true bila karyawan ini punya angka cuti dari import Excel.
    public boolean hasLeaveImportBaseline() {
        return importTotalLeave != null && importRemainingLeave != null && leaveImportBaselineAt != null;
    }
}