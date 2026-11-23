package sys.hris.sims.attendance.dto;
import java.time.LocalDate;
import java.time.LocalDateTime;
public record LeaveTodayResponse(String mode, String leaveTypeName, LocalDateTime boundary, LocalDateTime opensAt,
                                 Long leaveRequestId, LocalDate workDate, LocalDateTime workStart, LocalDateTime workEnd,
                                 long requiredMinutes, boolean canCancel) { }
