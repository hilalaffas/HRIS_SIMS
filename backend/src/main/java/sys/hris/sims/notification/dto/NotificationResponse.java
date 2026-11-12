package sys.hris.sims.notification.dto;

import java.time.LocalDateTime;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String type;
    private Long referenceId;
    private Map<String, Object> params;
    private LocalDateTime createdAt;
    private boolean read;
}
