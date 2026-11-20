package sys.hris.sims.holiday.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

// [BARU] Libur tahun depan ikut di-sync mulai bulan > 7 (Agustus), bukan hanya Desember.
class HolidaySyncWindowTest {

    @Test
    void syncsOnlyCurrentYearBeforeAugust() {
        assertThat(HolidaySyncWindow.yearsToSync(LocalDate.of(2026, 1, 1))).containsExactly(2026);
        assertThat(HolidaySyncWindow.yearsToSync(LocalDate.of(2026, 7, 31))).containsExactly(2026);
    }

    @Test
    void syncsNextYearFromAugust() {
        assertThat(HolidaySyncWindow.yearsToSync(LocalDate.of(2026, 8, 1))).containsExactly(2026, 2027);
        assertThat(HolidaySyncWindow.yearsToSync(LocalDate.of(2026, 11, 20))).containsExactly(2026, 2027);
        assertThat(HolidaySyncWindow.yearsToSync(LocalDate.of(2026, 12, 31))).containsExactly(2026, 2027);
    }
}
