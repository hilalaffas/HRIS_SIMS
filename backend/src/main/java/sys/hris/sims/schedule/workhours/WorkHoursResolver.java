package sys.hris.sims.schedule.workhours;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.entity.DivisiDaySchedule;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.schedule.entity.WorkSchedule;

// [BARU] Menentukan jam kerja efektif (WorkHours) seorang karyawan pada satu tanggal:
//   - divisi SHIFTING + shift terpasang -> jam shift dari jadwal yang dipublish
//   - divisi REGULAR                    -> jadwal khusus hari itu bila ada, jika tidak jam dasar divisi
//   - lainnya (tanpa divisi / shift kosong) -> 08:00 - 17:00 (perilaku lama)
// Kelas statis tanpa state: tidak mengubah konstruktor service mana pun.
public final class WorkHoursResolver {

    private WorkHoursResolver() { }

    public static boolean isShifting(Employee employee) {
        return employee != null && employee.getDivisi() != null
                && "SHIFTING".equalsIgnoreCase(employee.getDivisi().getTipeDivisi());
    }

    // `schedule` = baris jadwal shift karyawan pada tanggal itu (boleh null; hanya dipakai divisi Shifting).
    public static WorkHours resolve(Employee employee, LocalDate workDate, WorkSchedule schedule) {
        if (isShifting(employee)) {
            if (schedule != null && schedule.getShift() != null) {
                return WorkHours.ofShift(schedule.getShift().getStartTime(), schedule.getShift().getEndTime());
            }
            return WorkHours.defaultRegular();
        }
        return regularFor(employee == null ? null : employee.getDivisi(), workDate);
    }

    public static WorkHours regularFor(Divisi division, LocalDate date) {
        if (division == null) return WorkHours.defaultRegular();
        LocalTime start = parseOrDefault(division.getRegularStartTime(), WorkHours.DEFAULT_START);
        LocalTime end = parseOrDefault(division.getRegularEndTime(), WorkHours.DEFAULT_END);
        DayOfWeek day = date.getDayOfWeek();
        if (division.getDaySchedules() != null) {
            for (DivisiDaySchedule rule : division.getDaySchedules()) {
                if (rule.getDayOfWeek() != null && rule.getDayOfWeek() == day.getValue()) {
                    return WorkHours.ofRegular(
                            parseOrDefault(rule.getStartTime(), start),
                            parseOrDefault(rule.getEndTime(), end),
                            parseOrNull(rule.getBreakStartTime()),
                            parseOrNull(rule.getBreakEndTime()));
                }
            }
        }
        return WorkHours.ofRegular(start, end, null, null);
    }

    private static LocalTime parseOrDefault(String value, LocalTime fallback) {
        LocalTime parsed = parseOrNull(value);
        return parsed == null ? fallback : parsed;
    }

    private static LocalTime parseOrNull(String value) {
        return value == null || value.isBlank() ? null : LocalTime.parse(value.trim());
    }
}
