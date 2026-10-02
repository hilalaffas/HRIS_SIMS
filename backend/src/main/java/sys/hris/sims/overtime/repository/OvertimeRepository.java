package sys.hris.sims.overtime.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import sys.hris.sims.overtime.entity.OvertimeRequest;

@Repository
public interface OvertimeRepository extends JpaRepository<OvertimeRequest, Long> {

    // Riwayat lembur milik satu karyawan, tanggal terbaru duluan.
    List<OvertimeRequest> findByEmployee_EmployeeIdOrderByOvertimeDateDescOvertimeIdDesc(Long employeeId);

    // Dipakai OvertimeService.submit(): satu tanggal hanya boleh punya satu
    // pengajuan yang masih aktif (PENDING/APPROVED); yang REJECTED boleh diajukan ulang.
    boolean existsByEmployee_EmployeeIdAndOvertimeDateAndStatusIn(Long employeeId, LocalDate overtimeDate, List<String> statuses);
}
