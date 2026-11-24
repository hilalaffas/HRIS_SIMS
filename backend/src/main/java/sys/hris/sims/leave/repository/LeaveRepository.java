package sys.hris.sims.leave.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import sys.hris.sims.leave.entity.LeaveRequest;

@Repository
public interface LeaveRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByEmployee_EmployeeId(Long employeeId);
    List<LeaveRequest> findByStatus_StatusId(Long statusId);
    List<LeaveRequest> findByLeaveType_LeaveTypeId(Long leaveTypeId);

    //Overlap Cuti
    List<LeaveRequest> findByEmployee_EmployeeIdAndStatus_StatusNameIn(Long employeeId, List<String> statusNames);

    // [BARU] Reminder "Dicover Oleh": cari pengajuan cuti ORANG LAIN yang
    // mencantumkan nama karyawan tertentu di kolom coveredBy (dicocokkan
    // case-insensitive karena coveredBy tersimpan sebagai nama bebas, bukan
    // relasi FK -- lihat LeaveRequest.coveredBy & validateCoveredBy()).
    List<LeaveRequest> findByCoveredByIgnoreCaseAndStatus_StatusNameIn(String coveredBy, List<String> statusNames);
}