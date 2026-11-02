package sys.hris.sims.overtime.entity;
import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;
import sys.hris.sims.employee.entity.Employee;
@Data @Builder @NoArgsConstructor @AllArgsConstructor @Entity
@Table(name="overtime_approvals")
public class OvertimeApproval {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) @Column(name="approval_id") private Long approvalId;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="overtime_id",nullable=false) private OvertimeRequest overtime;
 @Column(name="approver_role",nullable=false,length=50) private String approverRole;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="approver_employee_id",nullable=false) private Employee approverEmployee;
 @Column(name="action",nullable=false,length=20) private String action;
 @Column(name="note") private String note;
 @Column(name="acted_at") private LocalDateTime actedAt;
}
