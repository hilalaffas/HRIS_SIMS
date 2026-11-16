package sys.hris.sims.overtime.repository;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sys.hris.sims.overtime.entity.OvertimeApproval;
public interface OvertimeApprovalRepository extends JpaRepository<OvertimeApproval,Long> {
 // [UBAH] approverEmployee ikut dimuat (nama approver dipakai di setiap response) -- tanpa N+1.
 @EntityGraph(attributePaths = "approverEmployee")
 List<OvertimeApproval> findByOvertime_OvertimeIdOrderByApprovalIdAsc(Long overtimeId);

 // [BARU] Semua tahap milik banyak pengajuan sekaligus (1 query, bukan 1 query per pengajuan).
 @EntityGraph(attributePaths = {"approverEmployee", "overtime"})
 List<OvertimeApproval> findByOvertime_OvertimeIdInOrderByApprovalIdAsc(Collection<Long> overtimeIds);

 // [BARU] Id pengajuan yang menugaskan karyawan ini sebagai approver (antrean Persetujuan Lembur).
 @Query("select distinct a.overtime.overtimeId from OvertimeApproval a where a.approverEmployee.employeeId = :employeeId")
 List<Long> findOvertimeIdsByApproverEmployeeId(@Param("employeeId") Long employeeId);

 List<OvertimeApproval> findByApproverEmployee_EmployeeIdAndAction(Long employeeId,String action);
}
