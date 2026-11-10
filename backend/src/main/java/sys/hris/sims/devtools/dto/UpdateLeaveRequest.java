package sys.hris.sims.devtools.dto;

import java.math.BigDecimal;

// [BARU] Body penyesuaian cuti satu karyawan (alat dev). Field null = tidak diubah.
//   joinDate             : yyyy-MM-dd; mengubah tanggal masuk = menggeser periode anniversary cuti
//   oldLeaveBalance      : Sisa Cuti Lama (employees.manual_leave_balance), menimpa saldo lama
//   currentYearRemaining : sisa cuti tahunan periode berjalan, dikonversi jadi "terpakai di luar sistem"
public record UpdateLeaveRequest(String joinDate, BigDecimal oldLeaveBalance, BigDecimal currentYearRemaining) {
}
