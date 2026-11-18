package sys.hris.sims.divisi.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

// [BARU] Jadwal KHUSUS satu hari kerja (1 = Senin ... 5 = Jumat) pada divisi REGULAR.
// Menimpa jam dasar divisi pada hari tersebut, termasuk jam istirahat.
// Jam disimpan "HH:mm" (pola yang sama dengan DivisiShift).
@Entity
@Table(name = "divisi_day_schedules")
@Data
public class DivisiDaySchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ISO: 1 = Senin ... 5 = Jumat (Sabtu & Minggu tetap libur pada divisi Regular).
    @JdbcTypeCode(SqlTypes.SMALLINT) // [BARU] samakan dengan kolom SMALLINT di migration V75
    @Column(name = "day_of_week", nullable = false)
    private Integer dayOfWeek;

    @Column(name = "start_time", nullable = false, length = 5)
    private String startTime;

    @Column(name = "break_start_time", nullable = false, length = 5)
    private String breakStartTime;

    @Column(name = "break_end_time", nullable = false, length = 5)
    private String breakEndTime;

    @Column(name = "end_time", nullable = false, length = 5)
    private String endTime;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "divisi_id", nullable = false)
    @JsonBackReference("daySchedules")
    @ToString.Exclude // cegah rekursi Divisi <-> jadwal hari (referensi dua arah)
    @EqualsAndHashCode.Exclude
    private Divisi divisi;
}
