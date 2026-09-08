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

    public void log(String username, Long userId, String action,
                    String entity, Long entityId, String description,
                    HttpServletRequest request) {
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

    public List<ActivityLog> getAllLogs() {
        return activityLogRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<ActivityLog> getLogsByUser(Long userId) {
        return activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // Cron: 0 0 0 1 * * artinya setiap jam 00:00:00 di tanggal 1 setiap bulan
    @Scheduled(cron = "0 0 0 1 * *")
    public void cleanupOldLogs() {
        LocalDateTime oneMonthAgo = LocalDateTime.now().minusMonths(1);
        activityLogRepository.deleteLogsOlderThan(oneMonthAgo);
        System.out.println("Log lama telah dibersihkan pada: " + LocalDateTime.now());
    }
}