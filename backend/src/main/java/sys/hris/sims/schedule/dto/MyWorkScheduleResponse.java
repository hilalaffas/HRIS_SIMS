package sys.hris.sims.schedule.dto;

import java.util.List;

public record MyWorkScheduleResponse(String divisionType, String divisionName,
                                     List<ScheduleEntryResponse> schedules) {
}
