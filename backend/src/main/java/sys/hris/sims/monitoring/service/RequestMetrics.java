package sys.hris.sims.monitoring.service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAccumulator;
import java.util.concurrent.atomic.LongAdder;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import sys.hris.sims.monitoring.dto.MonitorSummaryResponse;
import sys.hris.sims.monitoring.dto.MonitorSummaryResponse.RouteStat;

/**
 * [BARU] Penghitung performa di memori untuk SEMUA request /api (bukan hanya yang disimpan ke database):
 * jumlah, error 4xx/5xx, request lambat, rata-rata dan terlama per endpoint. Reset saat server restart.
 * Jumlah endpoint yang dilacak dibatasi supaya memori tidak membengkak.
 */
@Component
public class RequestMetrics {

    private static final int MAX_TRACKED_ROUTES = 500;
    private static final String UNMATCHED_ROUTE = "(tidak ada route)";

    private static final class RouteCounter {
        final String method;
        final String route;
        final LongAdder count = new LongAdder();
        final LongAdder clientErrors = new LongAdder();
        final LongAdder serverErrors = new LongAdder();
        final LongAdder slow = new LongAdder();
        final LongAdder totalMs = new LongAdder();
        final LongAccumulator maxMs = new LongAccumulator(Long::max, 0);
        volatile LocalDateTime lastAt;

        RouteCounter(String method, String route) {
            this.method = method;
            this.route = route;
        }
    }

    private final Map<String, RouteCounter> routes = new ConcurrentHashMap<>();
    private final LongAdder total = new LongAdder();
    private final LongAdder clientErrors = new LongAdder();
    private final LongAdder serverErrors = new LongAdder();
    private final LongAdder slow = new LongAdder();
    private final LongAdder totalMs = new LongAdder();
    private final AtomicLong dropped = new AtomicLong();
    private final LocalDateTime startedAt = LocalDateTime.now();

    @Value("${monitoring.slow-threshold-ms:1000}")
    private int slowThresholdMs;

    public int slowThresholdMs() {
        return slowThresholdMs;
    }

    public boolean isSlow(long durationMs) {
        return durationMs >= slowThresholdMs;
    }

    public void recordDropped() {
        dropped.incrementAndGet();
    }

    public void record(String method, String route, int status, long durationMs) {
        boolean isSlow = isSlow(durationMs);
        total.increment();
        totalMs.add(durationMs);
        if (status >= 500) {
            serverErrors.increment();
        } else if (status >= 400) {
            clientErrors.increment();
        }
        if (isSlow) {
            slow.increment();
        }

        String routeName = route == null || route.isBlank() ? UNMATCHED_ROUTE : route;
        String key = method + " " + routeName;
        RouteCounter counter = routes.get(key);
        if (counter == null) {
            if (routes.size() >= MAX_TRACKED_ROUTES) {
                // Batas tercapai: sisanya digabung ke satu baris supaya tidak membengkak.
                key = method + " (lainnya)";
                routeName = "(lainnya)";
            }
            final String finalRoute = routeName;
            counter = routes.computeIfAbsent(key, k -> new RouteCounter(method, finalRoute));
        }
        counter.count.increment();
        counter.totalMs.add(durationMs);
        counter.maxMs.accumulate(durationMs);
        counter.lastAt = LocalDateTime.now();
        if (status >= 500) {
            counter.serverErrors.increment();
        } else if (status >= 400) {
            counter.clientErrors.increment();
        }
        if (isSlow) {
            counter.slow.increment();
        }
    }

    public MonitorSummaryResponse snapshot() {
        long totalCount = total.sum();
        List<RouteStat> stats = routes.values().stream()
                .map(c -> {
                    long count = c.count.sum();
                    return new RouteStat(c.method, c.route, count, c.clientErrors.sum(), c.serverErrors.sum(),
                            c.slow.sum(), count == 0 ? 0 : c.totalMs.sum() / count, c.maxMs.get(), c.lastAt);
                })
                .sorted(Comparator.comparingLong(RouteStat::averageMs).reversed()
                        .thenComparing(Comparator.comparingLong(RouteStat::count).reversed()))
                .toList();
        return new MonitorSummaryResponse(startedAt, slowThresholdMs, totalCount, clientErrors.sum(),
                serverErrors.sum(), slow.sum(), totalCount == 0 ? 0 : totalMs.sum() / totalCount,
                dropped.get(), stats);
    }
}
