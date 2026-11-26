package sys.hris.sims.monitoring.dto;

import java.time.LocalDateTime;
import java.util.List;

// [BARU] Ringkasan performa sejak server menyala (dihitung di memori, reset saat server restart).
public record MonitorSummaryResponse(
        LocalDateTime since,
        int slowThresholdMs,
        long totalRequests,
        long clientErrors,
        long serverErrors,
        long slowRequests,
        long averageMs,
        long droppedEvents,
        List<RouteStat> routes) {

    public record RouteStat(
            String method,
            String route,
            long count,
            long clientErrors,
            long serverErrors,
            long slowRequests,
            long averageMs,
            long maxMs,
            LocalDateTime lastAt) {
    }
}
