package sys.hris.sims.monitoring.dto;

import java.time.LocalDateTime;

import sys.hris.sims.monitoring.entity.RequestEvent;

public record RequestEventResponse(
        Long id,
        LocalDateTime createdAt,
        String username,
        String method,
        String route,
        String path,
        int status,
        int durationMs,
        String ipAddress,
        String errorMessage) {

    public static RequestEventResponse from(RequestEvent e) {
        return new RequestEventResponse(e.getId(), e.getCreatedAt(), e.getUsername(), e.getMethod(),
                e.getRoute(), e.getPath(), e.getStatus(), e.getDurationMs(), e.getIpAddress(), e.getErrorMessage());
    }
}
