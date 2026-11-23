package sys.hris.sims.leave.service;

import java.math.BigDecimal;

/**
 * [UBAH] Aturan penyesuaian porsi "Sisa Cuti Lama" (manualLeaveBalance) ketika total hari sebuah
 * cuti yang SUDAH APPROVED berubah (mis. karena hari libur ditambah/dihapus, atau cuti hari ini
 * dibatalkan).
 *
 * Urutan pemotongan sama dengan LeaveQuotaAllocator: Sisa Cuti BERJALAN dulu, Sisa Cuti LAMA
 * hanya menampung kelebihannya. Karena itu saat total berubah, pool yang paling akhir dipakai
 * (Sisa Cuti Lama) adalah yang pertama dikembalikan, dan yang paling akhir diambil:
 *  - Total MENYUSUT -> porsi lama dikembalikan lebih dulu ke saldo lama (sebesar selisih, maksimal
 *    porsi lama cuti itu). Setelah itu baru porsi tahunan menyusut otomatis (dihitung dari totalDays).
 *  - Total BERTAMBAH -> tambahan diambil dari sisa cuti berjalan lebih dulu; kelebihannya diambil
 *    dari saldo lama yang masih ada (tidak pernah negatif).
 *  - Total tetap -> tidak ada perubahan.
 */
final class ManualLeaveRebalancer {

    record Result(BigDecimal manualLeaveDays, BigDecimal manualLeaveBalance) {
    }

    private ManualLeaveRebalancer() {
    }

    /**
     * @param oldTotal   total hari sebelum berubah
     * @param newTotal   total hari sesudah berubah
     * @param oldManual  porsi Sisa Cuti Lama pada cuti ini saat ini
     * @param balance    Sisa Cuti Lama karyawan saat ini
     * @param annualRoom sisa cuti berjalan SAAT INI (cuti ini sudah dihitung sebagai terpakai); hanya
     *                   dipakai saat total bertambah. Boleh negatif (dianggap tidak ada sisa).
     */
    static Result rebalance(BigDecimal oldTotal, BigDecimal newTotal,
                            BigDecimal oldManual, BigDecimal balance, BigDecimal annualRoom) {
        int compare = newTotal.compareTo(oldTotal);
        if (compare < 0) {
            BigDecimal giveBack = oldTotal.subtract(newTotal).min(oldManual).max(BigDecimal.ZERO);
            return new Result(oldManual.subtract(giveBack), balance.add(giveBack));
        }
        if (compare > 0) {
            BigDecimal extra = newTotal.subtract(oldTotal);
            BigDecimal fromCurrent = extra.min(annualRoom == null ? BigDecimal.ZERO : annualRoom.max(BigDecimal.ZERO));
            BigDecimal fromManual = extra.subtract(fromCurrent).min(balance.max(BigDecimal.ZERO));
            return new Result(oldManual.add(fromManual), balance.subtract(fromManual));
        }
        return new Result(oldManual, balance);
    }
}
