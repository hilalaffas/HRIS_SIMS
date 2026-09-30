package sys.hris.sims.activity_logs.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import sys.hris.sims.activity_logs.entity.ActivityLog;
import sys.hris.sims.activity_logs.repository.ActivityLogRepository;

import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    // [BARU] Action berawalan "GET_" (mis. GET_ALL_CUTI, GET_KARYAWAN) hanya
    // berarti "melihat data/menu", bukan perubahan data, jadi tidak dicatat
    // dan tidak ditampilkan di Log Sistem.
    private static final String VIEW_ACTION_PREFIX = "GET_";

    // [BARU] Sync libur nasional otomatis oleh "System" tidak ditampilkan
    // (log lama yang sudah tersimpan di database ikut disembunyikan).
    private static final String HIDDEN_ACTOR = "System";
    private static final String HIDDEN_ACTION = "SYNC_HOLIDAY";

    public void log(String username, Long userId, String action,
                    String entity, Long entityId, String description,
                    HttpServletRequest request) {
        // [BARU] Lewati log aktivitas baca-saja
        if (action != null && action.toUpperCase().startsWith(VIEW_ACTION_PREFIX)) {
            return;
        }

        String ipAddress = (request != null) ? request.getRemoteAddr() : "SYSTEM";

        ActivityLog log = ActivityLog.builder()
                .username(username)
                .userId(userId)
                .action(action)
                .entity(entity)
                .entityId(entityId)
                .description(description)
                .ipAddress(ipAddress)
                .build();

        activityLogRepository.save(log);
    }

    // [UBAH] Memakai findVisibleLogs: log GET_* dan sync libur otomatis milik
    // "System" yang sudah terlanjur tersimpan di database ikut disembunyikan.
    public List<ActivityLog> getAllLogs() {
        return activityLogRepository.findVisibleLogs(VIEW_ACTION_PREFIX, HIDDEN_ACTOR, HIDDEN_ACTION);
    }

    public List<ActivityLog> getLogsByUser(Long userId) {
        return activityLogRepository.findVisibleLogsByUserId(userId, VIEW_ACTION_PREFIX, HIDDEN_ACTOR, HIDDEN_ACTION);
    }

    // Cron: 0 0 0 1 * * artinya setiap jam 00:00:00 di tanggal 1 setiap bulan
    @Scheduled(cron = "0 0 0 1 * *")
    public void cleanupOldLogs() {
        LocalDateTime oneMonthAgo = LocalDateTime.now().minusMonths(1);
        activityLogRepository.deleteLogsOlderThan(oneMonthAgo);
        System.out.println("Log lama telah dibersihkan pada: " + LocalDateTime.now());
    }
}