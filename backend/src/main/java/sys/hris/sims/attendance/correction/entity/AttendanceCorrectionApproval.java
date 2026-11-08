package sys.hris.sims.attendance.correction.entity;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;
import sys.hris.sims.employee.entity.Employee;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "attendance_correction_approvals")
public class AttendanceCorrectionApproval {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "approval_id")
    private Long approvalId;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "correction_id", nullable = false)
    private AttendanceCorrection correction;

    @Column(name = "approver_role", nullable = false, length = 30)
    private String approverRole;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "approver_employee_id", nullable = false)
    private Employee approverEmployee;

    @Column(name = "action", nullable = false, length = 20)
    private String action;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "acted_at")
    private LocalDateTime actedAt;
}
