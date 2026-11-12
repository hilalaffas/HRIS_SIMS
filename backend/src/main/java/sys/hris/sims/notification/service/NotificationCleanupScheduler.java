package sys.hris.sims.notification.service;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * [BARU] Pembersihan otomatis notifikasi.
 * Berjalan tiap hari 02:00 WIB dan menghapus notifikasi yang umurnya lebih dari
 * `notification.retention-months` (default 2 bulan), baik sudah dibaca maupun belum.
 * (@EnableScheduling sudah aktif di SimsApplication.)
 */
@Component
@RequiredArgsConstructor
public class NotificationCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(NotificationCleanupScheduler.class);

    private final NotificationService notificationService;

    @Value("${notification.retention-months:2}")
    private int retentionMonths;

    @Scheduled(cron = "${notification.cleanup-cron:0 0 2 * * *}", zone = "Asia/Jakarta")
    public void purgeExpiredNotifications() {
        LocalDateTime cutoff = LocalDateTime.now().minusMonths(Math.max(retentionMonths, 1));
        int deleted = notificationService.purgeOlderThan(cutoff);
        log.info("Pembersihan notifikasi: {} baris lebih lama dari {} dihapus", deleted, cutoff);
    }
}
