package sys.hris.sims.holiday.service;

import java.time.LocalDate;
import java.util.List;

/**
 * [BARU] Menentukan tahun mana saja yang harus di-sync libur nasionalnya.
 *
 * Sebelumnya libur tahun depan baru di-sync saat bulan Desember, sehingga
 * kalender & perhitungan cuti yang melewati pergantian tahun (mis. 28 Des -
 * 4 Jan) belum mengenal libur 1 Januari. Sekarang libur tahun depan ikut
 * di-sync mulai bulan {@link #NEXT_YEAR_SYNC_START_MONTH} (Agustus), karena
 * SKB 3 Menteri biasanya sudah terbit sebelum itu.
 */
final class HolidaySyncWindow {

    /** Bulan (1-12) mulai kapan libur tahun depan ikut di-sync. 8 = Agustus (bulan > 7). */
    static final int NEXT_YEAR_SYNC_START_MONTH = 8;

    private HolidaySyncWindow() {
    }

    /** Tahun berjalan selalu di-sync; tahun depan ikut mulai bulan Agustus. */
    static List<Integer> yearsToSync(LocalDate today) {
        int year = today.getYear();
        return today.getMonthValue() >= NEXT_YEAR_SYNC_START_MONTH
                ? List.of(year, year + 1)
                : List.of(year);
    }
}
