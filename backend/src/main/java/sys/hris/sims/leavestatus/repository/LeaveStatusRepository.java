package sys.hris.sims.leavestatus.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import sys.hris.sims.leavestatus.entity.LeaveStatus;

import java.util.Optional;

@Repository
public interface LeaveStatusRepository extends JpaRepository<LeaveStatus, Long> {
    Optional<LeaveStatus> findByStatusName(String statusName);
    Optional<LeaveStatus> findByStatusNameIgnoreCase(String statusName);
}
