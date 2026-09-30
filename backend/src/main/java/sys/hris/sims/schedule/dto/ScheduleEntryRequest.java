package sys.hris.sims.schedule.dto;

import java.time.LocalDate;

// shiftId null = OFF / LIBUR
public record ScheduleEntryRequest(Long employeeId, LocalDate date, Long shiftId) {
}
