package sys.hris.sims.leave.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

// [UBAH] Penyesuaian porsi Sisa Cuti Lama saat total hari cuti APPROVED berubah (hari libur / pembatalan).
// Urutan pemotongan: sisa cuti BERJALAN dulu, Sisa Cuti LAMA hanya menampung kelebihannya.
class ManualLeaveRebalancerTest {

    private static BigDecimal d(String value) {
        return new BigDecimal(value);
    }

    private static void assertResult(ManualLeaveRebalancer.Result result, String manual, String balance) {
        assertThat(result.manualLeaveDays()).isEqualByComparingTo(manual);
        assertThat(result.manualLeaveBalance()).isEqualByComparingTo(balance);
    }

    @Test
    void shrinkRefundsManualPortionFirst() {
        // 6 hari: 4 dari berjalan + 2 dari lama. Menyusut jadi 5 -> 1 hari kembali ke saldo lama.
        assertResult(ManualLeaveRebalancer.rebalance(d("6"), d("5"), d("2"), d("0"), d("0")), "1", "1");
        // Menyusut 3 hari (6 -> 3) tapi porsi lama hanya 2 -> hanya 2 kembali, sisanya porsi berjalan menyusut.
        assertResult(ManualLeaveRebalancer.rebalance(d("6"), d("3"), d("2"), d("0"), d("0")), "0", "2");
    }

    @Test
    void shrinkWithoutManualPortionKeepsBalance() {
        // Seluruhnya dari cuti berjalan: saldo lama tidak disentuh.
        assertResult(ManualLeaveRebalancer.rebalance(d("6"), d("5"), d("0"), d("2"), d("0")), "0", "2");
    }

    @Test
    void growTakesFromCurrentFirstThenManual() {
        // Tambah 1 hari, sisa berjalan masih 3 -> semua dari berjalan, saldo lama tetap.
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("6"), d("0"), d("4"), d("3")), "0", "4");
        // Tambah 2 hari, sisa berjalan 1 -> 1 dari berjalan, 1 dari lama.
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("7"), d("0"), d("4"), d("1")), "1", "3");
        // Sisa berjalan habis -> semua tambahan dari lama.
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("7"), d("1"), d("4"), d("0")), "3", "2");
    }

    @Test
    void growNeverMakesManualBalanceNegative() {
        // Tambah 3 hari, berjalan habis, saldo lama hanya 1 -> ambil 1; sisanya jadi defisit tahunan.
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("8"), d("2"), d("1"), d("0")), "3", "0");
        // Sisa berjalan negatif (defisit) dianggap tidak ada ruang.
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("6"), d("0"), d("2"), d("-3")), "1", "1");
    }

    @Test
    void sameTotalChangesNothing() {
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("5"), d("2"), d("3"), d("4")), "2", "3");
    }
}
