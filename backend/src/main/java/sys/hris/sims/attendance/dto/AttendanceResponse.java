package sys.hris.sims.attendance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// [BARU] Response absensi -- data dikirim MENTAH (recordedAt ISO,
// koordinat mentah) dan diformat di frontend (services/attendanceService.js),
// mengikuti pola CutiService.js (dateText/logDateText) -- bukan backend
// yang menyusun string tampilan siap-pakai.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceResponse {
    private Long attendanceId;
    private Long employeeId;
    private String employeeName;

    private String action;   // MASUK / KELUAR
    private String reason;   // ABSEN / SAKIT / IZIN
    private String status;   // ON_TIME / LATE / DONE / SICK / IZIN
    private String note;

    private String photoUrl;

    private BigDecimal latitude;
    private BigDecimal longitude;

    // [BARU] Link Google Maps siap-pakai (https://www.google.com/maps?q=lat,lng)
    // -- disiapkan di backend supaya frontend tidak perlu menyusun URL manual
    // di banyak tempat kalau format link berubah suatu saat.
    private String mapsUrl;

    private LocalDateTime recordedAt;
    private LocalDate attendanceDate;
}
