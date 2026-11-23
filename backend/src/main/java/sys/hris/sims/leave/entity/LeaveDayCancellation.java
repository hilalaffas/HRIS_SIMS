package sys.hris.sims.leave.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor @Embeddable
public class LeaveDayCancellation {
    @Column(name="cancelled_date",nullable=false) private LocalDate date;
    @Column(name="cancelled_at",nullable=false) private LocalDateTime cancelledAt;
    @Column(name="actor_id",nullable=false) private Long actorId;
    @Column(name="actor_name",nullable=false) private String actorName;
    @Column(name="cancelled_days",nullable=false,precision=6,scale=2) private BigDecimal days;
    @Column(name="returned_manual_days",nullable=false,precision=6,scale=2) private BigDecimal returnedManualDays;
    @Column(name="returned_quota_days",nullable=false,precision=6,scale=2) private BigDecimal returnedQuotaDays;
}
