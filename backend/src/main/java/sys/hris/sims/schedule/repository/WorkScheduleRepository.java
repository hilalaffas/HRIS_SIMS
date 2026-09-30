package sys.hris.sims.schedule.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import sys.hris.sims.schedule.entity.WorkSchedule;

public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long> {

    List<WorkSchedule> findByWorkDateBetweenOrderByWorkDateAsc(LocalDate start, LocalDate end);

    List<WorkSchedule> findByEmployee_EmployeeIdInAndWorkDateBetween(
            Collection<Long> employeeIds, LocalDate start, LocalDate end);
}
