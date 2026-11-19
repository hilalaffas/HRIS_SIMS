package sys.hris.sims.overtime.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.holiday.entity.Holiday;
import sys.hris.sims.holiday.repository.HolidayRepository;
import sys.hris.sims.overtime.entity.OvertimeRequest;
import sys.hris.sims.overtime.repository.OvertimeRepository;

// [BARU] Aturan lembur hari libur (akhir pekan + libur nasional) untuk karyawan divisi Regular:
//   - Pengajuan: hanya pada hari kerja terakhir sebelum libur (satu pengajuan = satu tanggal).
//   - Absen   : hanya dibuka pada jendela lembur yang sudah disetujui semua approver; sesi yang
//               sudah dibuka tetap memakai tanggal kerja aslinya (termasuk melewati tengah malam).
// Karyawan Shifting tidak terkena aturan ini (jadwal shift mereka sendiri yang berlaku).
@Service
@RequiredArgsConstructor
public class HolidayOvertimePolicy {

    private static final int MAX_LOOKAHEAD_DAYS = 366;
    private static final int CALENDAR_YEARS_AROUND = 1;
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String ACTION_CHECK_IN = "MASUK";
    private static final String ACTION_CHECK_OUT = "KELUAR";

    private final HolidayRepository holidays;
    private final OvertimeRepository overtimes;
    private final AttendanceRepository attendances;

    public record Window(LocalDate date, LocalDateTime startsAt, LocalDateTime endsAt) { }

    // Nama field dibaca langsung oleh frontend (GET /api/lembur/holiday-window) -- jangan diubah sepihak.
    public record SubmissionWindow(boolean regularEmployee, LocalDate serverDate, LocalDate maxDate,
                                   List<LocalDate> allowedHolidayDates, List<LocalDate> holidayDates,
                                   List<Window> approvedOvertimes) { }

    public boolean regular(Employee employee) {
        return employee.getDivisi() == null || !"SHIFTING".equalsIgnoreCase(employee.getDivisi().getTipeDivisi());
    }

    public boolean holiday(LocalDate date) {
        return isWeekend(date) || holidays.existsByDate(date);
    }

    // Karyawan Regular yang lembur pada hari libur wajib absen (masuk & pulang) agar jamnya dihitung.
    public boolean requiresHolidayAttendance(Employee employee, LocalDate date) {
        return regular(employee) && holiday(date);
    }

    // Hari kerja terakhir sebelum tanggal libur (satu-satunya hari pengajuan lembur libur itu dibuka).
    public LocalDate submissionDate(LocalDate holidayDate) {
        LocalDate cursor = holidayDate.minusDays(1);
        for (int i = 0; i < MAX_LOOKAHEAD_DAYS; i++, cursor = cursor.minusDays(1)) {
            if (!holiday(cursor)) return cursor;
        }
        throw new IllegalStateException("Kalender hari kerja tidak tersedia.");
    }

    public void validateSubmission(Employee employee, LocalDate date, LocalDate today) {
        if (requiresHolidayAttendance(employee, date)) {
            LocalDate allowed = submissionDate(date);
            if (!today.equals(allowed)) {
                throw new IllegalArgumentException("Lembur hari libur tanggal " + date
                        + " hanya dapat diajukan pada hari kerja terakhir sebelumnya: " + allowed + ".");
            }
        } else if (date.isAfter(today)) {
            throw new IllegalArgumentException("Tanggal lembur hari kerja tidak boleh melebihi hari ini.");
        }
    }

    // Jendela lembur pada tanggal pengajuan; jam selesai <= jam mulai dianggap melewati tengah malam.
    public Window window(OvertimeRequest request) {
        LocalDate date = request.getOvertimeDate();
        LocalDateTime start = date.atTime(request.getStartTime());
        LocalDateTime end = date.atTime(request.getEndTime());
        if (!end.isAfter(start)) end = end.plusDays(1);
        return new Window(date, start, end);
    }

    @Transactional(readOnly = true)
    public SubmissionWindow submissionWindow(Employee employee, LocalDate today) {
        // [UBAH] Kalender libur dimuat SEKALI lalu dipakai semua pengecekan di bawah
        // (sebelumnya satu query existsByDate per tanggal di setiap loop/filter).
        List<LocalDate> holidayDates = holidays
                .findByDateBetweenOrderByDateAsc(today.minusYears(CALENDAR_YEARS_AROUND), today.plusYears(CALENDAR_YEARS_AROUND))
                .stream().map(Holiday::getDate).toList();
        Set<LocalDate> holidaySet = new HashSet<>(holidayDates);
        Predicate<LocalDate> nonWorkingDay = date -> isWeekend(date) || holidaySet.contains(date);

        boolean regularEmployee = regular(employee);
        List<LocalDate> allowed = new ArrayList<>();
        List<Window> approved = List.of();

        if (regularEmployee) {
            if (!nonWorkingDay.test(today)) {
                LocalDate limit = today.plusDays(MAX_LOOKAHEAD_DAYS);
                for (LocalDate date = today.plusDays(1); date.isBefore(limit) && nonWorkingDay.test(date); date = date.plusDays(1)) {
                    allowed.add(date);
                }
            }
            approved = overtimes
                    .findByEmployee_EmployeeIdAndOvertimeDateBetweenAndStatusIn(
                            employee.getEmployeeId(), today.minusDays(1), today.plusDays(62), List.of(STATUS_APPROVED))
                    .stream().filter(request -> nonWorkingDay.test(request.getOvertimeDate())).map(this::window).toList();
        }

        LocalDate maxDate = allowed.isEmpty() ? today : allowed.get(allowed.size() - 1);
        return new SubmissionWindow(regularEmployee, today, maxDate, allowed, holidayDates, approved);
    }

    // Jendela absen lembur untuk saat ini. null = bukan hari/jam lembur (absen reguler berlaku);
    // melempar IllegalStateException bila absen hari libur belum/tidak boleh dilakukan.
    // Sesi masuk yang masih terbuka (mis. lembur lewat tengah malam) tetap memakai tanggal kerja aslinya.
    @Transactional(readOnly = true)
    public Window attendanceWindow(Employee employee, LocalDateTime now, boolean checkout) {
        if (!regular(employee)) return null;
        Long employeeId = employee.getEmployeeId();
        LocalDate today = now.toLocalDate();

        for (LocalDate date : List.of(today.minusDays(1), today)) {
            var openCheckIn = attendances.findActiveByAction(employeeId, date, ACTION_CHECK_IN);
            if (openCheckIn.isPresent() && openCheckIn.get().isHolidayOvertime()
                    && !attendances.existsActiveByAction(employeeId, date, ACTION_CHECK_OUT)) {
                if (!checkout) throw new IllegalStateException("Selesaikan absen pulang lembur sebelumnya terlebih dahulu.");
                return new Window(date, openCheckIn.get().getHolidayOvertimeStart(), openCheckIn.get().getHolidayOvertimeEnd());
            }
        }

        if (checkout) {
            if (!holiday(today)) return null;
            throw new IllegalStateException("Anda belum absen masuk lembur hari libur.");
        }

        var active = overtimes
                .findByEmployee_EmployeeIdAndOvertimeDateBetweenAndStatusIn(employeeId, today.minusDays(1), today, List.of(STATUS_APPROVED))
                .stream().filter(request -> holiday(request.getOvertimeDate())).map(this::window)
                .filter(window -> !now.isBefore(window.startsAt()) && now.isBefore(window.endsAt()))
                .findFirst();
        if (active.isPresent()) return active.get();
        if (holiday(today)) {
            throw new IllegalStateException("Absensi hari libur hanya dibuka sesuai jam lembur yang sudah disetujui seluruh approver.");
        }
        return null;
    }

    private static boolean isWeekend(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }
}
