package sys.hris.sims.shift.dto;

import java.time.format.DateTimeFormatter;

import sys.hris.sims.shift.entity.Shift;

// [BARU] Jam dikirim sebagai string "HH:mm" supaya format-nya pasti sama
// di frontend (tidak tergantung setting serializer Jackson).
public record ShiftResponse(Long shiftId, String code, String name, String startTime, String endTime) {

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    public static ShiftResponse from(Shift shift) {
        return new ShiftResponse(
                shift.getShiftId(),
                shift.getCode(),
                shift.getName(),
                shift.getStartTime().format(HHMM),
                shift.getEndTime().format(HHMM));
    }
}
