package sys.hris.sims.schedule.workhours;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

// [BARU] Jam kerja EFEKTIF satu karyawan pada satu tanggal. Satu-satunya sumber jam masuk,
// jam pulang, istirahat, dan lama kerja wajib untuk absensi, pulang cepat, dan lembur,
// supaya aturannya tidak tersebar sebagai angka 08:00 / 17:00 di banyak tempat.
//
// requiredWork = lama kerja bersih yang harus dipenuhi sebelum boleh pulang tanpa alasan:
//   - shift                    : seluruh rentang shift (perilaku lama)
//   - reguler tanpa istirahat  : maksimal 8 jam (perilaku lama; 08:00-17:00 = 8 jam)
//   - reguler dengan istirahat : rentang dikurangi istirahat (Jumat 08:00-17:30, istirahat 1,5 jam = 8 jam)
public record WorkHours(LocalTime start, LocalTime end, LocalTime breakStart, LocalTime breakEnd,
                        Duration requiredWork) {

    public static final LocalTime DEFAULT_START = LocalTime.of(8, 0);
    public static final LocalTime DEFAULT_END = LocalTime.of(17, 0);
    private static final Duration STANDARD_WORK_DAY = Duration.ofHours(8);
    private static final long SECONDS_PER_DAY = 24L * 60 * 60;

    public static WorkHours defaultRegular() {
        return ofRegular(DEFAULT_START, DEFAULT_END, null, null);
    }

    public static WorkHours ofShift(LocalTime start, LocalTime end) {
        Duration span = span(start, end);
        return new WorkHours(start, end, null, null, span.isZero() ? STANDARD_WORK_DAY : span);
    }

    public static WorkHours ofRegular(LocalTime start, LocalTime end, LocalTime breakStart, LocalTime breakEnd) {
        Duration span = span(start, end);
        boolean hasBreak = breakStart != null && breakEnd != null;
        Duration required = hasBreak
                ? span.minus(span(breakStart, breakEnd))
                : (span.compareTo(STANDARD_WORK_DAY) < 0 ? span : STANDARD_WORK_DAY);
        return new WorkHours(start, end, breakStart, breakEnd, required);
    }

    // Shift malam: jam pulang jatuh di hari berikutnya.
    public boolean overnight() {
        return !end.isAfter(start);
    }

    public LocalDateTime startAt(LocalDate workDate) {
        return LocalDateTime.of(workDate, start);
    }

    public LocalDateTime endAt(LocalDate workDate) {
        return LocalDateTime.of(overnight() ? workDate.plusDays(1) : workDate, end);
    }

    public boolean hasBreak() {
        return breakStart != null && breakEnd != null;
    }

    // [BARU] Lama HADIR minimum (jam pulang dikurangi jam masuk, istirahat ikut terhitung) sebelum boleh
    // check-out tanpa alasan. Hari dengan jadwal khusus (ada istirahat): lama kerja wajib + istirahat,
    // jadi istirahat tidak bisa dipakai untuk pulang lebih awal. Tanpa istirahat: sama dengan requiredWork().
    public Duration requiredAttendance() {
        return hasBreak() ? requiredWork.plus(span(breakStart, breakEnd)) : requiredWork;
    }

    private static Duration span(LocalTime from, LocalTime to) {
        long seconds = (to.toSecondOfDay() - from.toSecondOfDay() + SECONDS_PER_DAY) % SECONDS_PER_DAY;
        return Duration.ofSeconds(seconds);
    }
}
