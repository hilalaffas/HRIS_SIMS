package sys.hris.sims.leave.service;

import java.math.BigDecimal;

/**
 * [BARU] Aturan penyesuaian porsi "Sisa Cuti Lama" (manualLeaveBalance) ketika total hari sebuah
 * cuti yang SUDAH APPROVED berubah (mis. karena hari libur ditambah/dihapus).
 *
 * Aturan sama dengan allocateManualLeaveOnApproval() & deleteCuti() di LeaveService:
 *  - Total menyusut di bawah porsi manual  -> kelebihannya dikembalikan ke saldo manual.
 *  - Total bertambah dan sebelumnya SELURUHNYA ditutup saldo manual -> tambahan diambil dari saldo
 *    manual yang masih ada (tidak pernah negatif); sisanya otomatis jadi porsi jatah tahunan.
 *  - Selain itu porsi manual tidak berubah; porsi jatah tahunan (total - manual) mengikuti
 *    total baru secara otomatis karena dihitung dari totalDays.
 */
final class ManualLeaveRebalancer {

    record Result(BigDecimal manualLeaveDays, BigDecimal manualLeaveBalance) {
    }

    private ManualLeaveRebalancer() {
    }

    static Result rebalance(BigDecimal oldTotal, BigDecimal newTotal,
                            BigDecimal oldManual, BigDecimal balance) {
        if (newTotal.compareTo(oldManual) < 0) {
            return new Result(newTotal, balance.add(oldManual.subtract(newTotal)));
        }
        if (newTotal.compareTo(oldTotal) > 0 && oldManual.compareTo(oldTotal) >= 0) {
            BigDecimal extra = balance.min(newTotal.subtract(oldManual)).max(BigDecimal.ZERO);
            return new Result(oldManual.add(extra), balance.subtract(extra));
        }
        return new Result(oldManual, balance);
    }
}
