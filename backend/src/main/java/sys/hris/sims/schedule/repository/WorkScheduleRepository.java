package sys.hris.sims.schedule.repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import sys.hris.sims.schedule.entity.WorkSchedule;

public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"employee.divisi", "shift"})
    List<WorkSchedule> findByEmployee_Divisi_IdInAndWorkDateBetween(Collection<Long> divisionIds, LocalDate from, LocalDate to);


    List<WorkSchedule> findByWorkDateBetweenOrderByWorkDateAsc(LocalDate start, LocalDate end);

    List<WorkSchedule> findByEmployee_EmployeeIdInAndWorkDateBetween(
            Collection<Long> employeeIds, LocalDate start, LocalDate end);

    List<WorkSchedule> findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
            Long employeeId, LocalDate start, LocalDate end);

    long deleteByEmployee_EmployeeIdInAndWorkDateBetween(
            Collection<Long> employeeIds, LocalDate start, LocalDate end);

}
