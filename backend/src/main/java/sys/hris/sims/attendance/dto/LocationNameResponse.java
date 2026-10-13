package sys.hris.sims.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// [BARU] Response GET /api/absensi/location-name. `locationName` bernilai
// null kalau nama lokasi tidak tersedia (API key belum diatur, kuota habis,
// atau titik tidak punya alamat) -- frontend cukup menampilkan koordinat.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationNameResponse {
    private String locationName;
}
