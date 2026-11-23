package sys.hris.sims.leave.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

// [BARU] Urutan pemotongan cuti: sisa cuti BERJALAN dulu, Sisa Cuti LAMA hanya menampung kelebihannya.
class LeaveQuotaAllocatorTest {

    private static BigDecimal d(String value) {
        return new BigDecimal(value);
    }

    private static void assertManual(String total, String current, String old, String expected) {
        assertThat(LeaveQuotaAllocator.manualPortion(d(total), d(current), d(old))).isEqualByComparingTo(expected);
    }

    @Test
    void currentLeaveCoversEverythingSoOldBalanceUntouched() {
        assertManual("3", "12", "5", "0");
        assertManual("12", "12", "5", "0");
    }

    @Test
    void onlyOverflowBeyondCurrentComesFromOldBalance() {
        assertManual("14", "12", "5", "2");
        assertManual("3", "1", "5", "2");
    }

    @Test
    void currentExhaustedTakesFromOldBalance() {
        assertManual("3", "0", "5", "3");
        assertManual("0.5", "0", "5", "0.5");
    }

    @Test
    void oldBalanceIsCappedAndNeverNegative() {
        assertManual("10", "2", "3", "3");   // sisa kekurangan jadi defisit tahunan
        assertManual("3", "0", "0", "0");
    }

    @Test
    void currentDeficitIsPaidFromOldBalance() {
        assertManual("2", "-4", "5", "2");
    }

    @Test
    void halfDayLeaveUsesCurrentFirst() {
        assertManual("0.5", "0.5", "5", "0");
        assertManual("0.5", "0.25", "5", "0.25");
    }
}
