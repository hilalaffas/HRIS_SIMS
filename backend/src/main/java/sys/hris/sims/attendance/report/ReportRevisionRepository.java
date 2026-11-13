package sys.hris.sims.attendance.report;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ReportRevisionRepository extends JpaRepository<ReportRevision, Long> {
    List<ReportRevision> findByEmployeeIdInAndDateBetweenOrderByIdDesc(Collection<Long> ids, LocalDate from, LocalDate to);
    Optional<ReportRevision> findFirstByEmployeeIdAndDateOrderByIdDesc(Long employeeId, LocalDate date);
}
