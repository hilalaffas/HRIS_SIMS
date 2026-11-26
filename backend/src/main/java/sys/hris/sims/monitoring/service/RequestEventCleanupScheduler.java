package sys.hris.sims.monitoring.service;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

// [BARU] Hapus jejak request yang lebih lama dari masa simpan (default 14 hari), tiap hari 02:30 WIB.
@Component
@RequiredArgsConstructor
public class RequestEventCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(RequestEventCleanupScheduler.class);

    private final RequestEventService requestEventService;

    @Value("${monitoring.retention-days:14}")
    private int retentionDays;

    @Scheduled(cron = "${monitoring.cleanup-cron:0 30 2 * * *}", zone = "Asia/Jakarta")
    public void purgeExpiredEvents() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(Math.max(retentionDays, 1));
        int deleted = requestEventService.purgeOlderThan(cutoff);
        log.info("Pembersihan jejak request: {} baris lebih lama dari {} dihapus", deleted, cutoff);
    }
}
