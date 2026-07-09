package sys.hris.sims.activity_logs.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import sys.hris.sims.activity_logs.entity.ActivityLog;
import sys.hris.sims.activity_logs.repository.ActivityLogRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    public void log(String username, Long userId, String action,
                    String entity, Long entityId, String description,
                    HttpServletRequest request) {
        ActivityLog log = ActivityLog.builder()
                .username(username)
                .userId(userId)
                .action(action)
                .entity(entity)
                .entityId(entityId)
                .description(description)
                .ipAddress(request.getRemoteAddr())
                .build();

        activityLogRepository.save(log);
    }

    public List<ActivityLog> getAllLogs() {
        return activityLogRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<ActivityLog> getLogsByUser(Long userId) {
        return activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}