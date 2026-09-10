package sys.hris.sims.employee.entity;

import jakarta.persistence.*;
import lombok.*;
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.user.entity.User;

import java.math.BigDecimal;
import java.time.LocalDate;

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
    // SYS-{tahun masuk}-{4 digit urut}, lihat V30__auto_generate_nik_karyawan_code.sql)
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
}