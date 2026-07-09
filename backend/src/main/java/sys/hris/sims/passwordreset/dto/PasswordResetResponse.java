package sys.hris.sims.passwordreset.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
public class PasswordResetResponse {

    private Long id;
    private String username;
    private String email;
    private String status;
    private LocalDateTime requestedAt;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String notes;
}