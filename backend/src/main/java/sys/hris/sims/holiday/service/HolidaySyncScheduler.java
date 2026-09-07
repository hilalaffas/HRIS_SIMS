package sys.hris.sims.holiday.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.holiday.dto.HolidaySyncResult;
import sys.hris.sims.holiday.service.HolidayService;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class HolidaySyncScheduler implements ApplicationRunner {

    private final HolidayService holidayService;
    private final ActivityLogService activityLogService;

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

    private void syncYear(int year) {
        try {
            HolidaySyncResult result = holidayService.syncNationalHolidays(year, null);
            log.info("Sync libur nasional tahun {} selesai (insert: {}, update: {}, skip: {})",
                    year, result.getInserted(), result.getUpdated(), result.getSkipped());

            activityLogService.log("System", null, "SYNC_HOLIDAY", "holidays", null,
                    "Sync libur nasional tahun " + year + " (insert: " + result.getInserted()
                            + ", update: " + result.getUpdated() + ", skip: " + result.getSkipped() + ")",
                    null);
        } catch (Exception e) {
            log.error("Gagal sync libur nasional tahun {}: {}", year, e.getMessage(), e);
        }
    }
}