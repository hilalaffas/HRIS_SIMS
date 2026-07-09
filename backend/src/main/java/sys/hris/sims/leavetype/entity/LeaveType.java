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

    @Column(name = "quota_male", nullable = false)
    private Integer quotaMale = 0;

    @Column(name = "quota_female", nullable = false)
    private Integer quotaFemale = 0;

    @Column(name = "deducts_annual_quota", nullable = false)
    private Boolean deductsAnnualQuota = true;

    @Column(name = "legal_note")
    private String legalNote;
}
