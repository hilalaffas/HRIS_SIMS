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

    // [BARU] Dipakai notifikasi lonceng karyawan (LeaveService.getMyApprovalStepUpdates):
    // approval milik SATU karyawan pemohon (leaveRequest.employee), yang aksinya
    // sudah tertentu (mis. APPROVED), TAPI status berkas induknya (leaveRequest.status)
    // masih tertentu juga (mis. PENDING) -- artinya approver lain masih perlu bertindak.
    List<LeaveRequestApproval> findByLeaveRequest_Employee_EmployeeIdAndActionAndLeaveRequest_Status_StatusNameOrderByActedAtDesc(
            Long employeeId, String action, String statusName);
}
