package sys.hris.sims.holiday.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ExternalHolidayDto {
    // [UBAH] @JsonAlias: tiap API libur memakai nama field berbeda.
    //   dayoffapi     -> tanggal / keterangan
    //   api-harilibur -> holiday_date / holiday_name
    //   api lain      -> name
    @JsonAlias({"tanggal", "holiday_date"})
    private String date;
    @JsonAlias({"keterangan", "holiday_name", "name"})
    private String description;

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}