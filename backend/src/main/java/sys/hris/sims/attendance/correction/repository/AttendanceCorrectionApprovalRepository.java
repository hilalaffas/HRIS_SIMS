package sys.hris.sims.attendance.correction.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import sys.hris.sims.attendance.correction.entity.AttendanceCorrectionApproval;

public interface AttendanceCorrectionApprovalRepository extends JpaRepository<AttendanceCorrectionApproval, Long> {
    List<AttendanceCorrectionApproval> findByCorrection_CorrectionIdOrderByApprovalIdAsc(Long correctionId);
}
