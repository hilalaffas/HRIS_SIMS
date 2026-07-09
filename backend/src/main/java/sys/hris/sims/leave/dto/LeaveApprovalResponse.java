package sys.hris.sims.leave.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
public class LeaveApprovalResponse {
    private Long leaveRequestId;
    private String employeeName;
    private String leaveType;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer totalDays;
    private String reason;
    private String pendingWork;
    private String coveredBy;
    private String overallStatus;
    private String myApprovalStatus;
    private String reviewNote;
    private List<LeaveApprovalLogResponse> approvalLogs;
}
