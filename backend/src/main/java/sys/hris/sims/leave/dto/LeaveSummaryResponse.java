package sys.hris.sims.leave.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// [BARU] Ringkasan cuti global per karyawan, sejak tanggal masuk sampai hari ini
// (tabel "Ringkasan Cuti" di halaman Karyawan).
//
// Hubungan angka:  totalOverallLeave = usedLeave + forfeitedLeave + totalAvailableLeave
//                  totalAvailableLeave = remainingPreviousLeave + remainingCurrentLeave
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveSummaryResponse {
    private Long employeeId;
    private String employeeName;
    private String nik;
    private String divisionName;
    private LocalDate joinDate;
    private LocalDate asOfDate;

    // Total keseluruhan cuti sejak masuk
    private BigDecimal totalOverallLeave;
    // Cuti yang sudah digunakan sejak masuk (cuti yang memotong jatah, hanya yang sudah lewat/hari ini)
    private BigDecimal usedLeave;
    // Cuti hangus (kedaluwarsa) di periode yang sudah berakhir
    private BigDecimal forfeitedLeave;
    // Total cuti yang masih tersedia = sisa lama + sisa berjalan
    private BigDecimal totalAvailableLeave;
    // Sisa cuti lama (carry-forward, dari Sisa Cuti Lama/manual)
    private BigDecimal remainingPreviousLeave;
    // Sisa cuti berjalan (cuti tahunan periode anniversary berjalan)
    private BigDecimal remainingCurrentLeave;
}
