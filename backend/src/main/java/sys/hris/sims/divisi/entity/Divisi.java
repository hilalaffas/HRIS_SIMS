package sys.hris.sims.divisi.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.CascadeType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import lombok.Data;

@Entity
@Table(name = "divisi")
@Data
public class Divisi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String namaDivisi;

    // [BARU] REGULAR atau SHIFTING (Non Regular). Default REGULAR.
    @Column(name = "tipe_divisi", nullable = false, length = 20)
    private String tipeDivisi = "REGULAR";

    @OneToMany(mappedBy = "divisi", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @JsonManagedReference
    private List<DivisiShift> shifts = new ArrayList<>();

    // [BARU] Jam kerja dasar divisi REGULAR ("HH:mm"). Sengaja TANPA nilai awal di Java: request
    // lama (mis. DataDivisi yang hanya mengirim nama & tipe) tidak boleh menimpa jam yang sudah
    // diatur. DivisiService.create() mengisi 08:00 - 17:00 bila kosong.
    @Column(name = "regular_start_time", nullable = false, length = 5)
    private String regularStartTime;

    @Column(name = "regular_end_time", nullable = false, length = 5)
    private String regularEndTime;

    // [BARU] Jadwal khusus per hari (menimpa jam dasar pada hari tersebut).
    @OneToMany(mappedBy = "divisi", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dayOfWeek ASC")
    @JsonManagedReference("daySchedules")
    private List<DivisiDaySchedule> daySchedules = new ArrayList<>();
}
