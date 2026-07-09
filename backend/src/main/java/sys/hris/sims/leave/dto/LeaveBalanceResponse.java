package sys.hris.sims.leave.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LeaveBalanceResponse {
    private Long employeeId;
    private String employeeName;
    private Integer annualQuota;
    private Integer usedAnnualLeave;
    private Integer remainingAnnualLeave;
}
