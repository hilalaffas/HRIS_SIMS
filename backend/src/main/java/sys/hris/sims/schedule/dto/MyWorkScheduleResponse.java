package sys.hris.sims.schedule.dto;

import java.util.List;

// [UBAH] + regularSchedule: jam kerja divisi Regular (dasar + jadwal khusus per hari); null untuk
// divisi Shifting. Frontend memakainya untuk absensi, pulang cepat, lembur, dan tabel riwayat.
public record MyWorkScheduleResponse(String divisionType, String divisionName,
                                     List<ScheduleEntryResponse> schedules,
                                     RegularScheduleResponse regularSchedule) {
}
