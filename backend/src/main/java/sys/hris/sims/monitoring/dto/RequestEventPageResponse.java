package sys.hris.sims.monitoring.dto;

import java.util.List;

public record RequestEventPageResponse(
        List<RequestEventResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}
