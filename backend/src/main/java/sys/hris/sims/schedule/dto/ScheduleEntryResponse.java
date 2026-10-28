package sys.hris.sims.schedule.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import sys.hris.sims.schedule.entity.WorkSchedule;

public record ScheduleEntryResponse(Long employeeId, LocalDate date, Long shiftId, String shiftName,
                                    LocalTime startTime, LocalTime endTime) {

    public static ScheduleEntryResponse from(WorkSchedule ws) {
        return new ScheduleEntryResponse(
                ws.getEmployee().getEmployeeId(),
                ws.getWorkDate(),
                ws.getShift() != null ? ws.getShift().getShiftId() : null,
                ws.getShift() != null ? ws.getShift().getName() : null,
                ws.getShift() != null ? ws.getShift().getStartTime() : null,
                ws.getShift() != null ? ws.getShift().getEndTime() : null);
    }
}
