package sys.hris.sims.leave.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// [BARU] Hasil pencocokan satu karyawan:
//   sisa seharusnya = totalGrantedQuota - usedLeave - forfeitedLeave
//   difference      = actualRemaining - expectedRemaining   (0 = cocok)
// difference > 0: sisa di sistem LEBIH BANYAK dari seharusnya (ada pemakaian/hangus yang belum tercatat)
// difference < 0: sisa di sistem LEBIH SEDIKIT dari seharusnya
//
// status: OK | TIDAK_SESUAI | BELUM_ADA_RIWAYAT (belum ada data pemakaian sama sekali) | BELUM_BERHAK (belum genap 1 tahun)
public record LeaveReconciliationRow(Long employeeId,
                                     String employeeName,
                                     String nik,
                                     LocalDate joinDate,
                                     int fullYears,
                                     BigDecimal totalGrantedQuota,
                                     BigDecimal usedLeave,
                                     BigDecimal forfeitedLeave,
                                     BigDecimal actualRemaining,
                                     BigDecimal expectedRemaining,
                                     BigDecimal difference,
                                     String status) {

    public static final String OK = "OK";
    public static final String MISMATCH = "TIDAK_SESUAI";
    public static final String NO_HISTORY = "BELUM_ADA_RIWAYAT";
    public static final String NOT_ELIGIBLE = "BELUM_BERHAK";
}
