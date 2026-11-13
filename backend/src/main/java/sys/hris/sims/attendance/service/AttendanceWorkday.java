package sys.hris.sims.attendance.service;

import java.time.*;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;

// Shared work-date selection for attendance and checkout overtime.
public final class AttendanceWorkday {
    private AttendanceWorkday() {}
    public record Context(LocalDate workDate, WorkSchedule schedule) {}
    public static Context resolve(Employee employee, LocalDateTime now, boolean checkout,
                                  WorkScheduleRepository schedules, AttendanceRepository records) {
        LocalDate today = now.toLocalDate();
        if (employee.getDivisi() == null || !"SHIFTING".equalsIgnoreCase(employee.getDivisi().getTipeDivisi()))
            return new Context(today, null);
        WorkSchedule current = find(schedules, employee.getEmployeeId(), today);
        LocalDate yesterday = today.minusDays(1);
        WorkSchedule previous = find(schedules, employee.getEmployeeId(), yesterday);
        if (previous != null && previous.getShift() != null
                && !previous.getShift().getEndTime().isAfter(previous.getShift().getStartTime())
                && !records.existsActiveByAction(employee.getEmployeeId(), today, "MASUK")
                && !records.existsActiveByAction(employee.getEmployeeId(), yesterday, "KELUAR")) {
            boolean open = records.existsActiveByAction(employee.getEmployeeId(), yesterday, "MASUK");
            boolean beforeCurrentStart = current == null || current.getShift() == null
                    || now.isBefore(today.atTime(current.getShift().getStartTime()));
            boolean beforePreviousEnd = now.isBefore(today.atTime(previous.getShift().getEndTime()));
            if ((checkout && open) || (!checkout && beforeCurrentStart && beforePreviousEnd))
                return new Context(yesterday, previous);
        }
        return new Context(today, current);
    }
    private static WorkSchedule find(WorkScheduleRepository repository, Long employeeId, LocalDate date) {
        return repository.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(employeeId, date, date)
                .stream().findFirst().orElse(null);
    }
}
