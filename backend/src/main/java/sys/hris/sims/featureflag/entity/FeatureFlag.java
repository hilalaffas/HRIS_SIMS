package sys.hris.sims.featureflag.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

// [BARU] Saklar fitur on/off yang berlaku global (lihat V43 migration).
@Entity
@Table(name = "feature_flags")
@Data
@NoArgsConstructor
public class FeatureFlag {

    @Id
    @Column(name = "flag_key", length = 50)
    private String flagKey;

    @Column(nullable = false)
    private Boolean enabled = true;

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
