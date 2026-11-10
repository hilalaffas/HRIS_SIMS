package sys.hris.sims.leavetype.entity;

import jakarta.persistence.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "leave_types")
public class LeaveType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "leave_type_id")
    private Long leaveTypeId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Builder.Default // [BARU]
    @Column(name = "quota_male", nullable = false)
    private Integer quotaMale = 0;

    @Builder.Default // [BARU]
    @Column(name = "quota_female", nullable = false)
    private Integer quotaFemale = 0;

    @Builder.Default // [BARU]
    @Column(name = "deducts_annual_quota", nullable = false)
    private Boolean deductsAnnualQuota = true;

    @Column(name = "legal_note")
    private String legalNote;

    // [BARU] Jenis cuti sistem "Cuti hangus" (V59): sisa cuti yang kedaluwarsa. Bukan hari cuti
    // sungguhan -- disembunyikan dari form pengajuan, absensi, laporan, dan kalender.
    @Builder.Default // [BARU]
    @Column(name = "is_forfeiture", nullable = false)
    private Boolean forfeiture = false;
}
