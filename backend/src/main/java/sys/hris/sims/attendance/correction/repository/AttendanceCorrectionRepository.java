package sys.hris.sims.attendance.correction.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import sys.hris.sims.attendance.correction.entity.AttendanceCorrection;

public interface AttendanceCorrectionRepository extends JpaRepository<AttendanceCorrection, Long> {
    List<AttendanceCorrection> findByEmployee_EmployeeIdOrderByCreatedAtDesc(Long employeeId);
    boolean existsByAttendance_AttendanceId(Long attendanceId);
}
