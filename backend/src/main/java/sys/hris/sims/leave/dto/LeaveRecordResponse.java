package sys.hris.sims.leave.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.leave.entity.LeaveDayCancellation;
import sys.hris.sims.leave.entity.LeaveRequest;

/** History/calendar contract without the employee's division, user, or Hibernate proxies. */
public record LeaveRecordResponse(
        Long leaveRequestId, EmployeeInfo employee, StatusInfo status, TypeInfo leaveType,
        EmployeeInfo reviewedBy, LocalDate startDate, LocalDate endDate, BigDecimal totalDays,
        BigDecimal originalTotalDays, BigDecimal manualLeaveDays, String session,
        LocalDateTime submittedAt, LocalDateTime approvedAt, LocalDateTime returnedAt,
        String reviewNote, String reason, String pendingWork, String coveredBy, Boolean importedHistory,
        Long leaderEmployeeId, Long spvEmployeeId, Long managerEmployeeId, Long hrdEmployeeId,
        List<LeaveDayCancellation> cancellations) {

    public record EmployeeInfo(Long employeeId, String fullName, String nikKaryawan) {
        static EmployeeInfo from(Employee employee) {
            return employee == null ? null : new EmployeeInfo(employee.getEmployeeId(),
                    employee.getFullName(), employee.getNikKaryawan());
        }
    }
    public record StatusInfo(Long statusId, String statusName) {}
    public record TypeInfo(Long leaveTypeId, String name, Boolean deductsAnnualQuota, Boolean forfeiture) {}

    public static LeaveRecordResponse from(LeaveRequest leave) {
        var status = leave.getStatus();
        var type = leave.getLeaveType();
        return new LeaveRecordResponse(leave.getLeaveRequestId(), EmployeeInfo.from(leave.getEmployee()),
                status == null ? null : new StatusInfo(status.getStatusId(), status.getStatusName()),
                type == null ? null : new TypeInfo(type.getLeaveTypeId(), type.getName(),
                        type.getDeductsAnnualQuota(), type.getForfeiture()),
                EmployeeInfo.from(leave.getReviewedBy()), leave.getStartDate(), leave.getEndDate(),
                leave.getTotalDays(), leave.getOriginalTotalDays(), leave.getManualLeaveDays(), leave.getSession(),
                leave.getSubmittedAt(), leave.getApprovedAt(), leave.getReturnedAt(), leave.getReviewNote(),
                leave.getReason(), leave.getPendingWork(), leave.getCoveredBy(), leave.getImportedHistory(),
                leave.getLeaderEmployeeId(), leave.getSpvEmployeeId(), leave.getManagerEmployeeId(),
                leave.getHrdEmployeeId(), List.copyOf(leave.getCancellations()));
    }
}
