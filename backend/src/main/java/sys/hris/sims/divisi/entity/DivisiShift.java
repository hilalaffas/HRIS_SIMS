package sys.hris.sims.divisi.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "shift_divisi")
@Data
public class DivisiShift {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_shift")
    private Long id;
    @Column(name = "nama_shift", nullable = false, length = 100)
    private String name;
    @Column(name = "jam_masuk", nullable = false, length = 5)
    private String startTime;
    @Column(name = "jam_pulang", nullable = false, length = 5)
    private String endTime;
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;
    @Column(name = "schedule_shift_id")
    private Long scheduleShiftId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_divisi", nullable = false)
    @JsonBackReference
    private Divisi divisi;
}
