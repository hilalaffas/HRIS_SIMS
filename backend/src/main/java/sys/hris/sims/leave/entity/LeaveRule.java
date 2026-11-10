package sys.hris.sims.leave.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

// [BARU] Aturan cuti bertipe tanggal yang bisa diatur dari panel /devAccess (lihat V63 migration).
@Entity
@Table(name = "leave_rules")
@Data
@NoArgsConstructor
public class LeaveRule {

    @Id
    @Column(name = "rule_key", length = 50)
    private String ruleKey;

    @Column(name = "date_value")
    private LocalDate dateValue;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        this.updatedAt = LocalDateTime.now();
    }
}
