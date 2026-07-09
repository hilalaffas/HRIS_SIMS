package sys.hris.sims.leave.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sys.hris.sims.leave.entity.LeaveRequestApproval;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeaveRequestApprovalRepository extends JpaRepository<LeaveRequestApproval, Long> {
    List<LeaveRequestApproval> findByLeaveRequest_LeaveRequestId(Long leaveRequestId);

    List<LeaveRequestApproval> findByApproverRole(String approverRole);

    List<LeaveRequestApproval> findByApproverRoleAndAction(String approverRole, String action);

    Optional<LeaveRequestApproval> findByLeaveRequest_LeaveRequestIdAndApproverRole(Long leaveRequestId, String approverRole);

    List<LeaveRequestApproval> findByApproverEmployee_EmployeeId(Long employeeId);

    List<LeaveRequestApproval> findByApproverEmployee_EmployeeIdAndAction(Long employeeId, String action);

    Optional<LeaveRequestApproval> findByLeaveRequest_LeaveRequestIdAndApproverEmployee_EmployeeId(Long leaveRequestId, Long employeeId);
}
