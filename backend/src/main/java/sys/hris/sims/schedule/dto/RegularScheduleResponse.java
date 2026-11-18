package sys.hris.sims.schedule.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;

import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.schedule.workhours.WorkHours;

// [BARU] Jadwal divisi REGULAR yang dikirim ke frontend (halaman Absensi saya & Laporan Absensi),
// supaya jam masuk/pulang/istirahat per hari dihitung dengan aturan yang sama di semua layar.
// Tanggal TIDAK dihitung di sini; frontend memilih aturan menurut hari dari tanggalnya
// (utils/regularSchedule.js -> resolveRegularDay).
public record RegularScheduleResponse(String startTime, String endTime, List<DayRule> dayRules) {

    public record DayRule(Integer dayOfWeek, String startTime, String breakStartTime,
                          String breakEndTime, String endTime) { }

    // Jam kerja pada tanggal tertentu: jadwal khusus hari itu bila ada, jika tidak jam dasar.
    public WorkHours workHoursOn(LocalDate date) {
        for (DayRule rule : dayRules) {
            if (rule.dayOfWeek() != null && rule.dayOfWeek() == date.getDayOfWeek().getValue()) {
                return WorkHours.ofRegular(LocalTime.parse(rule.startTime()), LocalTime.parse(rule.endTime()),
                        LocalTime.parse(rule.breakStartTime()), LocalTime.parse(rule.breakEndTime()));
            }
        }
        return WorkHours.ofRegular(LocalTime.parse(startTime), LocalTime.parse(endTime), null, null);
    }

    private static final String DEFAULT_START = "08:00";
    private static final String DEFAULT_END = "17:00";

    // Divisi null / SHIFTING tidak punya jadwal reguler -> null.
    public static RegularScheduleResponse from(Divisi division) {
        if (division != null && "SHIFTING".equalsIgnoreCase(division.getTipeDivisi())) return null;
        if (division == null) return new RegularScheduleResponse(DEFAULT_START, DEFAULT_END, List.of());
        List<DayRule> rules = division.getDaySchedules() == null ? List.of() : division.getDaySchedules().stream()
                .sorted(Comparator.comparing(rule -> rule.getDayOfWeek() == null ? 0 : rule.getDayOfWeek()))
                .map(rule -> new DayRule(rule.getDayOfWeek(), rule.getStartTime(), rule.getBreakStartTime(),
                        rule.getBreakEndTime(), rule.getEndTime()))
                .toList();
        return new RegularScheduleResponse(
                division.getRegularStartTime() == null ? DEFAULT_START : division.getRegularStartTime(),
                division.getRegularEndTime() == null ? DEFAULT_END : division.getRegularEndTime(),
                rules);
    }
}
