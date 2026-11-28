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
        var recent = schedules.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
                employee.getEmployeeId(), today.minusDays(2), today.plusDays(2));
        WorkSchedule current = recent.stream().filter(s -> s.getWorkDate().equals(today)).findFirst().orElse(null);
        if (!records.existsActiveByAction(employee.getEmployeeId(), today, "MASUK")) {
            for (int i = recent.size() - 1; i >= 0; i--) {
                WorkSchedule previous = recent.get(i);
                LocalDate date = previous.getWorkDate();
                if (!date.isBefore(today) || previous.getShift() == null
                        || records.existsActiveByAction(employee.getEmployeeId(), date, "KELUAR")) continue;
                var hours = sys.hris.sims.schedule.workhours.WorkHours.ofShift(
                        previous.getShift().getStartTime(), previous.getShift().getEndTime());
                LocalDateTime end = records.findActiveByAction(employee.getEmployeeId(), date, "MASUK")
                        .map(record -> record.getScheduledWorkEnd()).orElse(hours.endAt(date));
                LocalDateTime nextStart = recent.stream().filter(s -> s.getWorkDate().isAfter(date) && s.getShift() != null)
                        .map(s -> s.getWorkDate().atTime(s.getShift().getStartTime()))
                        .filter(start -> start.isAfter(end)).min(LocalDateTime::compareTo).orElse(null);
                boolean open = records.existsActiveByAction(employee.getEmployeeId(), date, "MASUK");
                if (checkout && open && now.isBefore(checkoutDeadline(end, nextStart)))
                    return new Context(date, previous);
                boolean beforeCurrentStart = current == null || current.getShift() == null
                        || now.isBefore(today.atTime(current.getShift().getStartTime()));
                if (!checkout && hours.overnight() && now.isBefore(end) && beforeCurrentStart)
                    return new Context(date, previous);
            }
        }
        return new Context(today, current);
    }
    // Display-only assumed checkout uses the scheduled end; this deadline only
    // releases the previous work date so the next shift can be attended normally.
    static LocalDateTime checkoutDeadline(LocalDateTime end, LocalDateTime nextStart) {
        Duration gap = nextStart == null ? Duration.ofHours(8) : Duration.between(end, nextStart);
        return end.plus(!gap.isNegative() && gap.compareTo(Duration.ofHours(8)) < 0
                ? gap.dividedBy(2) : Duration.ofHours(8));
    }
}
