package sys.hris.sims.holiday.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class HolidayRequest {
    private String name;
    private LocalDate date;
    private String description;
    private Boolean isNational = true;
}