package sys.hris.sims.holiday.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import sys.hris.sims.holiday.dto.HolidaySyncResult;
import sys.hris.sims.holiday.service.HolidayService;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class HolidaySyncScheduler implements ApplicationRunner {

    private final HolidayService holidayService;

    /**
     * Dijalankan SEKALI saat aplikasi selesai start (misal saat deploy pertama).
     */
    @Override
    public void run(ApplicationArguments args) {
        log.info("Menjalankan sync libur nasional saat startup...");
        LocalDate now = LocalDate.now();
        syncYear(now.getYear());
        if (now.getMonthValue() == 12) {
            syncYear(now.getYear() + 1);
        }
    }

    /**
     * Jalan tiap hari jam 01:00 WIB untuk sync selanjutnya.
     */
    @Scheduled(cron = "0 0 1 * * *", zone = "Asia/Jakarta")
    public void autoSyncHolidays() {
        LocalDate now = LocalDate.now();
        syncYear(now.getYear());
        if (now.getMonthValue() == 12) {
            syncYear(now.getYear() + 1);
        }
    }

    /**
     * [BARU] Self-healing: tiap jam (menit ke-15), bila tabel libur tahun ini masih kosong
     * (mis. sync saat startup gagal karena API eksternal down/timeout), coba sync lagi.
     * Bila tabel sudah terisi, method ini tidak melakukan apa-apa.
     */
    @Scheduled(cron = "0 15 * * * *", zone = "Asia/Jakarta")
    public void retryIfEmpty() {
        int year = LocalDate.now().getYear();
        boolean isEmpty = holidayService
                .getHolidaysByRange(LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31))
                .isEmpty();
        if (isEmpty) {
            log.warn("Tabel libur nasional {} masih kosong, mencoba sync ulang...", year);
            syncYear(year);
        }
    }

    private void syncYear(int year) {
        try {
            HolidaySyncResult result = holidayService.syncNationalHolidays(year, null);
            log.info("Sync libur nasional tahun {} selesai (insert: {}, update: {}, skip: {})",
                    year, result.getInserted(), result.getUpdated(), result.getSkipped());
            // [UBAH] Sync otomatis (startup & cron harian) tidak lagi dicatat ke
            // Log Sistem karena bukan aksi user dan hasilnya sering "insert 0,
            // update 0". Cukup log.info di atas. Sync manual oleh user lewat
            // HolidayController tetap tercatat.
        } catch (Exception e) {
            log.error("Gagal sync libur nasional tahun {}: {}", year, e.getMessage(), e);
        }
    }
}