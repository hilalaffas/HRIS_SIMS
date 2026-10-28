package sys.hris.sims.shift.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import sys.hris.sims.shift.entity.Shift;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    List<Shift> findAllByOrderByDisplayOrderAsc();
    List<Shift> findAllByDivisionIdOrderByDisplayOrderAsc(Long divisionId);
    boolean existsByDivisionIdAndCode(Long divisionId, String code);
}
