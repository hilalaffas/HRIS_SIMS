package sys.hris.sims.overtime.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// [BARU] Response lembur -- data mentah, diformat di frontend
// (services/overtimeService.js).
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeResponse {
    private Long overtimeId;
    private Long employeeId;
    private String employeeName;

    private LocalDate overtimeDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer totalMinutes;

    private String reason;
    private String status; // PENDING / APPROVED / REJECTED

    private LocalDateTime createdAt;
}
