package sys.hris.sims.devtools.dto;

import java.math.BigDecimal;

// [BARU] Satu baris "Terpakai Ringkasan" di /devAccess > Saldo Cuti. Angka sama persis dengan tabel
// Ringkasan Cuti (Laporan).
//   editable      : true hanya bila karyawan sudah punya angka import Excel (V64)
//   minUsedLeave  : batas bawah Terpakai = cuti yang disetujui SETELAH import (tidak boleh dihapus lewat edit);
//                   null bila tidak editable
public record DevLeaveUsedRow(
        Long employeeId,
        String fullName,
        String nik,
        boolean editable,
        BigDecimal totalOverallLeave,
        BigDecimal usedLeave,
        BigDecimal minUsedLeave,
        BigDecimal forfeitedLeave,
        BigDecimal totalAvailableLeave,
        BigDecimal reconcileDifference,
        String reconcileStatus) {
}
