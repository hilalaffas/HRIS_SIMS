package sys.hris.sims.leave.service;

import java.math.BigDecimal;

/**
 * [BARU] Aturan pembagian beban sebuah cuti yang memotong kuota tahunan antara
 * "Sisa Cuti Berjalan" (kuota periode anniversary yang sedang berjalan) dan
 * "Sisa Cuti Lama" (employees.manual_leave_balance).
 *
 * Urutan pemotongan:
 *  1. Sisa Cuti BERJALAN dipotong lebih dulu.
 *  2. Sisa Cuti LAMA baru terpotong setelah Sisa Cuti Berjalan habis (selisihnya saja).
 *  3. Bila keduanya tidak cukup, sisa kekurangan tetap tercatat sebagai defisit cuti tahunan
 *     (perilaku lama tidak berubah) -- saldo lama tidak pernah menjadi negatif.
 *
 * Kelas ini murni Java (tanpa Spring/database) supaya mudah diuji sendiri.
 */
final class LeaveQuotaAllocator {

    private LeaveQuotaAllocator() {
    }

    /**
     * Porsi cuti yang dibebankan ke Sisa Cuti Lama (disimpan di leave_requests.manual_leave_days).
     * Sisanya (totalDays - hasil ini) otomatis menjadi porsi cuti tahunan/berjalan.
     *
     * @param totalDays        total hari cuti yang disetujui
     * @param currentRemaining sisa cuti berjalan SEBELUM cuti ini dipotong (boleh negatif = defisit)
     * @param oldBalance       Sisa Cuti Lama saat ini
     */
    static BigDecimal manualPortion(BigDecimal totalDays, BigDecimal currentRemaining, BigDecimal oldBalance) {
        BigDecimal total = nonNegative(totalDays);
        BigDecimal currentRoom = nonNegative(currentRemaining);
        BigDecimal overflow = total.subtract(currentRoom.min(total));
        return overflow.min(nonNegative(oldBalance)).max(BigDecimal.ZERO);
    }

    private static BigDecimal nonNegative(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.max(BigDecimal.ZERO);
    }
}
