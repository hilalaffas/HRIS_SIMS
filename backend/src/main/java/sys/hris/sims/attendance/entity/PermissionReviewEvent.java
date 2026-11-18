package sys.hris.sims.attendance.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionReviewEvent {
    @Column(name = "event_type", nullable = false, length = 40)
    private String eventType;
    @Column(name = "event_at", nullable = false)
    private LocalDateTime eventAt;
    @Column(name = "actor_name", nullable = false, length = 150)
    private String actorName;
    @Column(name = "actor_role", length = 50)
    private String actorRole;
    @Column(name = "note", length = 2000)
    private String note;
    @Column(name = "before_start_date")
    private LocalDate beforeStartDate;
    @Column(name = "before_end_date")
    private LocalDate beforeEndDate;
    @Column(name = "after_start_date")
    private LocalDate afterStartDate;
    @Column(name = "after_end_date")
    private LocalDate afterEndDate;
    @Column(name = "document_url", length = 500)
    private String documentUrl;
    @Column(name = "approval_status", length = 24)
    private String approvalStatus;
    @Column(name = "document_status", length = 24)
    private String documentStatus;
}
