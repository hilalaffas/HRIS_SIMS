package sys.hris.sims.leave.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class LeaveApprovalLogResponse {
    private String approverRole;
    private String action;
    private String approverName;
    private String note;
    private LocalDateTime actedAt;
}
