package sys.hris.sims.attendance.correction.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import sys.hris.sims.attendance.correction.entity.AttendanceCorrection;

public interface AttendanceCorrectionRepository extends JpaRepository<AttendanceCorrection, Long> {
    List<AttendanceCorrection> findByEmployee_EmployeeIdOrderByCreatedAtDesc(Long employeeId);
    boolean existsByAttendance_AttendanceId(Long attendanceId);

    // [BARU] Semua koreksi + absensi & karyawan dalam 1 query (findAll() memicu query per baris).
    @Query("select c from AttendanceCorrection c join fetch c.attendance join fetch c.employee")
    List<AttendanceCorrection> findAllWithDetails();
}
