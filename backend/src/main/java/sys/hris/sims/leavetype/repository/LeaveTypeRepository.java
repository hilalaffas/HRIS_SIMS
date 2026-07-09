package sys.hris.sims.leavetype.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import sys.hris.sims.leavetype.entity.LeaveType;

import java.util.Optional;

@Repository
public interface LeaveTypeRepository extends JpaRepository<LeaveType, Long> {
    Optional<LeaveType> findByName(String name); 
    Optional<LeaveType> findByNameIgnoreCase(String name);
}
