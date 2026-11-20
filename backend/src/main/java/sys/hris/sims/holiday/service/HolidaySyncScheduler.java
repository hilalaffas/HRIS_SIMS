package sys.hris.sims.holiday.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.beans.factory.annotation.Value; // [BARU]
import org.springframework.boot.ApplicationRunner;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import sys.hris.sims.holiday.dto.HolidaySyncResult;
import sys.hris.sims.holiday.service.HolidayService;

import java.time.LocalDate;
import java.time.ZoneId;

@Slf4j
@Component
@RequiredArgsConstructor
public class HolidaySyncScheduler implements ApplicationRunner {

    // [BARU] Server (Render) berjalan di UTC; bulan/tahun harus mengikuti WIB.
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Jakarta");

    private final HolidayService holidayService;

    // [BARU] Saklar penyelarasan hari cuti saat startup. Default aktif; matikan dengan environment
    // variable HOLIDAY_RECALC_LEAVE_ON_STARTUP=false bila perlu (tanpa ubah kode).
    @Value("${holiday.recalc-leave-on-startup:true}")
    private boolean recalcLeaveOnStartup;

    /**
     * Dijalankan SEKALI saat aplikasi selesai start (misal saat deploy pertama).
     */
    @Override
    public void run(ApplicationArguments args) {
        log.info("Menjalankan sync libur nasional saat startup...");
        syncCurrentWindow(); // [UBAH] sebelumnya tahun depan hanya di-sync saat bulan 12
        alignUpcomingLeaveDays(); // [BARU]
    }

    // [BARU] Selaraskan total hari cuti yang belum selesai dengan kalender libur terkini. Kegagalan
    // di sini tidak boleh menggagalkan startup aplikasi.
    private void alignUpcomingLeaveDays() {
        if (!recalcLeaveOnStartup) {
            log.info("Penyelarasan hari cuti saat startup dimatikan (holiday.recalc-leave-on-startup=false)");
            return;
        }
        try {
            holidayService.recalculateUpcomingLeaveDays(LocalDate.now(APP_ZONE));
        } catch (Exception e) {
            log.error("Penyelarasan hari cuti saat startup gagal: {}", e.getMessage(), e);
        }
    }

    /**
     * Jalan tiap hari jam 01:00 WIB untuk sync selanjutnya.
     */
    @Scheduled(cron = "0 0 1 * * *", zone = "Asia/Jakarta")
    public void autoSyncHolidays() {
        syncCurrentWindow(); // [UBAH] sebelumnya tahun depan hanya di-sync saat bulan 12
    }

    /**
     * [UBAH] Self-healing: tiap jam (menit ke-15), bila suatu tahun yang seharusnya sudah
     * ter-sync (tahun ini, dan tahun depan mulai Agustus) belum punya SATU PUN libur nasional
     * (mis. sync gagal karena API eksternal down/timeout, atau SKB tahun depan belum tersedia
     * di API), coba sync lagi. Bila sudah terisi, method ini tidak melakukan apa-apa.
     * Sebelumnya hanya mengecek tahun ini dan hanya melihat "tabel kosong"; libur manual HRD
     * di tahun itu membuat tabel tidak kosong sehingga libur nasional tidak pernah diambil.
     */
    @Scheduled(cron = "0 15 * * * *", zone = "Asia/Jakarta")
    public void retryIfEmpty() {
        for (int year : HolidaySyncWindow.yearsToSync(LocalDate.now(APP_ZONE))) {
            if (!holidayService.hasNationalHolidays(year)) {
                log.warn("Libur nasional {} belum ada, mencoba sync ulang...", year);
                syncYear(year);
            }
        }
    }

    // [BARU] Tahun berjalan + (mulai bulan Agustus) tahun depan.
    private void syncCurrentWindow() {
        HolidaySyncWindow.yearsToSync(LocalDate.now(APP_ZONE)).forEach(this::syncYear);
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