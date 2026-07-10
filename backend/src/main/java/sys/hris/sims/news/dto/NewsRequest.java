package sys.hris.sims.news.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class NewsRequest {

    private String title;
    private String content;
    private String category;
    private Boolean published;

}