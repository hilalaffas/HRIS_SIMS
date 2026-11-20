package sys.hris.sims.leave.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

// [BARU] Penyesuaian porsi Sisa Cuti Lama saat total hari cuti APPROVED berubah karena hari libur.
class ManualLeaveRebalancerTest {

    private static BigDecimal d(String value) {
        return new BigDecimal(value);
    }

    private static void assertResult(ManualLeaveRebalancer.Result result, String manual, String balance) {
        assertThat(result.manualLeaveDays()).isEqualByComparingTo(manual);
        assertThat(result.manualLeaveBalance()).isEqualByComparingTo(balance);
    }

    @Test
    void shrinkBelowManualPortionRefundsDifference() {
        // 6 hari ditutup penuh saldo manual; libur baru -> 5 hari: 1 hari kembali ke saldo manual.
        assertResult(ManualLeaveRebalancer.rebalance(d("6"), d("5"), d("6"), d("0")), "5", "1");
        assertResult(ManualLeaveRebalancer.rebalance(d("6"), d("4"), d("6"), d("0")), "4", "2");
    }

    @Test
    void shrinkKeepsManualPortionWhenStillCovered() {
        // Porsi manual 3 dari 6 hari; total jadi 5: porsi tahunan yang menyusut (3 -> 2), manual tetap.
        assertResult(ManualLeaveRebalancer.rebalance(d("6"), d("5"), d("3"), d("4")), "3", "4");
        assertResult(ManualLeaveRebalancer.rebalance(d("6"), d("5"), d("0"), d("2")), "0", "2");
    }

    @Test
    void growTakesExtraFromManualBalanceOnlyWhenPreviouslyFullyManual() {
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("6"), d("5"), d("3")), "6", "2");
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("6"), d("5"), d("0")), "5", "0");
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("7"), d("5"), d("1")), "6", "0");
        assertResult(ManualLeaveRebalancer.rebalance(d("5"), d("6"), d("3"), d("4")), "3", "4");
    }
}
