package sys.hris.sims.leave.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    // [BARU] Laporan Absensi (HRD): cuti yang sudah DISETUJUI dan beririsan dengan
    // rentang tanggal, untuk banyak karyawan sekaligus. Dipakai supaya hari cuti
    // tidak terhitung "Alpha" di laporan (data absensi tidak memuat cuti).
    @Query("""
            select l from LeaveRequest l
            join fetch l.status s
            join fetch l.leaveType t
            where l.employee.employeeId in :employeeIds
              and upper(s.statusName) = 'APPROVED'
              and l.startDate <= :endDate
              and l.endDate >= :startDate
            order by l.startDate asc
            """)
    List<LeaveRequest> findApprovedForReport(@Param("employeeIds") List<Long> employeeIds,
                                             @Param("startDate") LocalDate startDate,
                                             @Param("endDate") LocalDate endDate);
}
