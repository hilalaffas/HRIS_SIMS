package sys.hris.sims.overtime.repository;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import sys.hris.sims.overtime.entity.OvertimeApproval;
public interface OvertimeApprovalRepository extends JpaRepository<OvertimeApproval,Long> {
 List<OvertimeApproval> findByOvertime_OvertimeIdOrderByApprovalIdAsc(Long overtimeId);
 List<OvertimeApproval> findByApproverEmployee_EmployeeIdAndAction(Long employeeId,String action);
}
