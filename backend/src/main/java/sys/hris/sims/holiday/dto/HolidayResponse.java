package sys.hris.sims.holiday.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class HolidayResponse {
    private Long holidayId;
    private String name;
    private LocalDate date;
    private String description;
    private Boolean isNational;
    private Long createdBy;
    private LocalDateTime createdAt;
}