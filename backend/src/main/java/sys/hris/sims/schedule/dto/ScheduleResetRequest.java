package sys.hris.sims.schedule.dto;

import java.util.List;

public record ScheduleResetRequest(int year, int month, List<Long> employeeIds) {
}
