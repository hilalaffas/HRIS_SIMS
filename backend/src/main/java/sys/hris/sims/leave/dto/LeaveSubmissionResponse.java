package sys.hris.sims.leave.dto;

import java.math.BigDecimal;
import sys.hris.sims.leave.entity.LeaveRequest;

/** Result of a submission; contains no persistence entities or lazy associations. */
public record LeaveSubmissionResponse(Long leaveRequestId, BigDecimal totalDays, String reviewNote) {
    public static LeaveSubmissionResponse from(LeaveRequest leave) {
        return new LeaveSubmissionResponse(leave.getLeaveRequestId(), leave.getTotalDays(), leave.getReviewNote());
    }
}
