package sys.hris.sims.schedule.dto;

import java.time.LocalDate;

import sys.hris.sims.schedule.entity.WorkSchedule;

public record ScheduleEntryResponse(Long employeeId, LocalDate date, Long shiftId) {

    public static ScheduleEntryResponse from(WorkSchedule ws) {
        return new ScheduleEntryResponse(
                ws.getEmployee().getEmployeeId(),
                ws.getWorkDate(),
                ws.getShift() != null ? ws.getShift().getShiftId() : null);
    }
}
