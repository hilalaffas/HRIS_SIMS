package sys.hris.sims.monitoring.service;

import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.monitoring.dto.RequestEventPageResponse;
import sys.hris.sims.monitoring.dto.RequestEventResponse;
import sys.hris.sims.monitoring.entity.RequestEvent;
import sys.hris.sims.monitoring.repository.RequestEventRepository;

@Service
@RequiredArgsConstructor
public class RequestEventService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_QUERY_LENGTH = 100;

    private final RequestEventRepository repository;
    private final RequestMetrics metrics;

    /**
     * kind: "error" (status >= 400), "slow" (>= ambang lambat), "write" (mengubah data), selain itu semua.
     * q: cari di username, path, route, atau pesan error.
     */
    @Transactional(readOnly = true)
    public RequestEventPageResponse search(String kind, String q, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        String keyword = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        if (keyword.length() > MAX_QUERY_LENGTH) {
            keyword = keyword.substring(0, MAX_QUERY_LENGTH);
        }
        String normalizedKind = kind == null ? "all" : kind.trim().toLowerCase(Locale.ROOT);

        Page<RequestEvent> result = repository.search(
                "error".equals(normalizedKind),
                "slow".equals(normalizedKind),
                "write".equals(normalizedKind),
                metrics.slowThresholdMs(),
                keyword,
                "%" + keyword + "%",
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));

        return new RequestEventPageResponse(
                result.getContent().stream().map(RequestEventResponse::from).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional
    public int purgeOlderThan(LocalDateTime cutoff) {
        return repository.deleteOlderThan(cutoff);
    }
}
