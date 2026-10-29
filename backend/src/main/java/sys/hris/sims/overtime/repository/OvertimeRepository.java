package sys.hris.sims.overtime.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import sys.hris.sims.overtime.entity.OvertimeRequest;

@Repository
public interface OvertimeRepository extends JpaRepository<OvertimeRequest, Long> {

    // Riwayat lembur milik satu karyawan, tanggal terbaru duluan.
    List<OvertimeRequest> findByEmployee_EmployeeIdOrderByOvertimeDateDescOvertimeIdDesc(Long employeeId);

    // [BARU] Semua pengajuan lembur semua karyawan -- halaman Persetujuan (SuperAdmin).
    List<OvertimeRequest> findAllByOrderByOvertimeDateDescOvertimeIdDesc();

    // Dipakai OvertimeService.submit(): satu tanggal hanya boleh punya satu
    // pengajuan yang masih aktif (PENDING/APPROVED); yang REJECTED boleh diajukan ulang.
    boolean existsByEmployee_EmployeeIdAndOvertimeDateAndStatusIn(Long employeeId, LocalDate overtimeDate, List<String> statuses);

    // [BARU] Lembur aktif satu karyawan pada satu tanggal, urut jam mulai.
    // Dipakai OvertimeService.getExtensionWindow()/submitExtension() untuk
    // menentukan jam mulai lembur tambahan saat check-out.
    List<OvertimeRequest> findByEmployee_EmployeeIdAndOvertimeDateAndStatusInOrderByStartTimeAscOvertimeIdAsc(
            Long employeeId, LocalDate overtimeDate, List<String> statuses);

    List<OvertimeRequest> findByEmployee_EmployeeIdAndOvertimeDateBetweenAndStatusIn(
            Long employeeId, LocalDate startDate, LocalDate endDate, List<String> statuses);

    // [BARU] Laporan Absensi (HRD): lembur banyak karyawan sekaligus pada rentang tanggal.
    @Query("""
            select o from OvertimeRequest o
            join fetch o.employee e
            where e.employeeId in :employeeIds
              and o.overtimeDate between :startDate and :endDate
            order by o.overtimeDate asc, o.startTime asc
            """)
    List<OvertimeRequest> findForReport(@Param("employeeIds") List<Long> employeeIds,
                                        @Param("startDate") LocalDate startDate,
                                        @Param("endDate") LocalDate endDate);
}
