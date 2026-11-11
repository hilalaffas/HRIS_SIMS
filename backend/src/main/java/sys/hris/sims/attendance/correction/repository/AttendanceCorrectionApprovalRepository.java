package sys.hris.sims.attendance.correction.repository;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sys.hris.sims.attendance.correction.entity.AttendanceCorrectionApproval;

public interface AttendanceCorrectionApprovalRepository extends JpaRepository<AttendanceCorrectionApproval, Long> {
    List<AttendanceCorrectionApproval> findByCorrection_CorrectionIdOrderByApprovalIdAsc(Long correctionId);

    // [BARU] Tahap approval banyak koreksi sekaligus (+ data approver), urutan sama dengan method di atas.
    @Query("""
            select a from AttendanceCorrectionApproval a
            join fetch a.approverEmployee
            where a.correction.correctionId in :ids
            order by a.approvalId asc
            """)
    List<AttendanceCorrectionApproval> findAllByCorrectionIds(@Param("ids") Collection<Long> ids);
}
