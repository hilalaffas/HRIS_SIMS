package sys.hris.sims.attendance.dto;

import java.time.LocalDateTime;

// [BARU] Status cuti karyawan HARI INI untuk tombol absen (GET /api/absensi/me/leave-today).
//   mode      : NONE | FULL_DAY | HALF_MORNING | HALF_AFTERNOON
//   boundary  : batas dua sesi setengah hari (null bila bukan setengah hari)
//   opensAt   : kapan absen masuk dibuka (hanya HALF_MORNING; satu jam sebelum cuti berakhir)
// Hanya berisi jenis cuti -- alasan cuti (teks bebas) sengaja tidak disertakan.
public record LeaveTodayResponse(String mode, String leaveTypeName,
                                 LocalDateTime boundary, LocalDateTime opensAt) {
}
