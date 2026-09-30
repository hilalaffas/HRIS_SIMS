package sys.hris.sims.schedule.dto;

import java.util.List;

public record SchedulePublishRequest(List<ScheduleEntryRequest> entries) {
}
