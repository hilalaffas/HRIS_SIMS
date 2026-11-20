package sys.hris.sims.devtools.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// [BARU] Satu baris riwayat cuti HASIL IMPORT (is_imported_history = true) untuk panel /devAccess.
// forfeit = true -> catatan "Cuti hangus". hasExcelBaseline = true -> angka cuti karyawan murni
// mengikuti Excel (V64), jadi menghapus baris ini tidak mengubah Ringkasan Cuti sama sekali.
public record DevImportedLeaveRow(
        Long leaveRequestId,
        Long employeeId,
        String employeeName,
        String nikKaryawan,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal totalDays,
        String leaveTypeName,
        boolean forfeit,
        boolean hasExcelBaseline) {
}
