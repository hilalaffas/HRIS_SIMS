package sys.hris.sims.overtime.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// [BARU] "Jendela" lembur tambahan hari ini, dihitung server (jam WIB):
//   startTime  = akhir lembur aktif terakhir hari ini, atau jam pulang (17:00)
//   maxEndTime = jam sekarang (lembur susulan tidak boleh di masa depan)
//   canExtend  = maxEndTime > startTime (ada waktu yang bisa diajukan)
//   entries    = lembur aktif (PENDING/APPROVED) hari ini, urut jam mulai
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OvertimeExtensionWindowResponse {
    private LocalDate overtimeDate;
    private LocalTime workEndTime;
    private LocalTime startTime;
    private LocalTime maxEndTime;
    private boolean canExtend;
    private List<OvertimeResponse> entries;
}
