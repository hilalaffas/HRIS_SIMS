package sys.hris.sims.overtime.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.Data;

// [BARU] Body JSON pengajuan lembur. SENGAJA TIDAK ADA totalMinutes/status --
// keduanya diisi backend supaya tidak bisa dimanipulasi dari klien.
@Data
public class OvertimeSubmitRequest {
    private LocalDate overtimeDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String reason;
}
