package sys.hris.sims.attendance.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.entity.Attendance;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;

// [BARU] SATU sumber aturan hubungan CUTI <-> ABSENSI (backend adalah sumber kebenaran,
// UI hanya cerminannya):
//   1. Cuti sehari penuh / multi-hari yang sudah DISETUJUI -> absen masuk & keluar ditolak.
//   2. Cuti setengah hari PAGI (dan Cuti Urgent setengah hari, kode "HALF") -> absen masuk
//      dibuka SATU JAM sebelum cuti berakhir (cuti sampai 13:00 -> absen mulai 12:00).
//   3. Cuti setengah hari SIANG -> absen masuk normal; check-out sah tanpa aturan
//      "pulang cepat" (karyawan memang hanya bekerja setengah hari).
//   4. Cuti PENDING tidak memblokir absen. Begitu cuti DISETUJUI, absen yang terlanjur
//      tercatat di tanggal cuti dihapus (lihat reconcileOnApproval) dan hari itu tampil
//      sebagai CUTI di laporan.
@Service
@RequiredArgsConstructor
public class LeaveAttendancePolicy {

    public enum Mode { NONE, FULL_DAY, HALF_MORNING, HALF_AFTERNOON }

    // boundary = batas pagi/siang; opensAt = awal absen masuk dibuka (hanya HALF_MORNING).
    public record LeaveToday(Mode mode, String leaveTypeName, LocalDateTime boundary, LocalDateTime opensAt) {
        public static final LeaveToday NONE = new LeaveToday(Mode.NONE, null, null, null);

        public boolean isHalfDay() {
            return mode == Mode.HALF_MORNING || mode == Mode.HALF_AFTERNOON;
        }
    }

    // Divisi Regular: cuti pagi berakhir 13:00. Divisi Shifting: tengah-tengah shift.
    private static final LocalTime REGULAR_HALF_DAY_BOUNDARY = LocalTime.of(13, 0);
    private static final Duration EARLY_OPEN = Duration.ofHours(1);
    private static final long DEFAULT_SHIFT_SECONDS = 8L * 60 * 60;
    private static final long SECONDS_PER_DAY = 24L * 60 * 60;
    private static final String REASON_ABSEN = "ABSEN";
    private static final String ACTION_MASUK = "MASUK";
    private static final String SESSION_AFTERNOON = "SIANG";
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("HH:mm");

    private final LeaveRepository leaveRepository;
    private final AttendanceRepository attendanceRepository;
    private final WorkScheduleRepository workScheduleRepository;

    // ---------- status cuti pada satu tanggal ----------

    // `schedule` = jadwal karyawan di tanggal itu (boleh null). Hanya dipakai divisi Shifting.
    @Transactional(readOnly = true)
    public LeaveToday resolve(Employee employee, LocalDate workDate, WorkSchedule schedule) {
        List<LeaveRequest> leaves = leaveRepository.findApprovedCovering(employee.getEmployeeId(), workDate);
        if (leaves.isEmpty()) return LeaveToday.NONE;

        // Cuti sehari penuh menang atas setengah hari bila keduanya mencakup tanggal yang sama.
        Optional<LeaveRequest> fullDay = leaves.stream().filter(leave -> !isHalfDay(leave)).findFirst();
        if (fullDay.isPresent()) {
            return new LeaveToday(Mode.FULL_DAY, typeName(fullDay.get()), null, null);
        }

        LeaveRequest half = leaves.get(0);
        LocalDateTime boundary = halfDayBoundary(employee, workDate, schedule);
        if (SESSION_AFTERNOON.equalsIgnoreCase(half.getSession())) {
            return new LeaveToday(Mode.HALF_AFTERNOON, typeName(half), boundary, null);
        }
        return new LeaveToday(Mode.HALF_MORNING, typeName(half), boundary, boundary.minus(EARLY_OPEN));
    }

    // Melempar IllegalStateException (pesan tampil di UI) bila absen belum boleh dilakukan.
    public void assertCanAttend(LeaveToday leave, String action, LocalDateTime now) {
        if (leave.mode() == Mode.FULL_DAY) {
            throw new IllegalStateException(
                    "Anda sedang cuti hari ini (" + leave.leaveTypeName() + "). Absensi tidak diperlukan.");
        }
        if (leave.mode() == Mode.HALF_MORNING && ACTION_MASUK.equals(action) && now.isBefore(leave.opensAt())) {
            throw new IllegalStateException("Anda cuti setengah hari (pagi) sampai "
                    + leave.boundary().format(CLOCK) + ". Absen masuk dibuka mulai "
                    + leave.opensAt().format(CLOCK) + ".");
        }
    }

    // ---------- sinkronisasi saat cuti DISETUJUI ----------

    // Dipanggil sekali pada titik cuti berubah menjadi APPROVED (approval terakhir atau
    // auto-approve HR). Cuti sehari/multi-hari: semua absen biasa di rentang tanggal dihapus.
    // Cuti setengah hari: absen dihapus HANYA bila absen masuknya jatuh di jendela cuti
    // (pagi: sebelum absen dibuka; siang: setelah batas siang) -- absen yang sah tetap aman.
    @Transactional
    public int reconcileOnApproval(LeaveRequest cuti) {
        Employee employee = cuti.getEmployee();
        Long employeeId = employee.getEmployeeId();

        if (!isHalfDay(cuti)) {
            return attendanceRepository.deleteAbsenInRange(employeeId, cuti.getStartDate(), cuti.getEndDate());
        }

        LocalDate date = cuti.getStartDate();
        WorkSchedule schedule = workScheduleRepository
                .findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(employeeId, date, date)
                .stream().findFirst().orElse(null);
        LocalDateTime boundary = halfDayBoundary(employee, date, schedule);
        boolean afternoon = SESSION_AFTERNOON.equalsIgnoreCase(cuti.getSession());

        Optional<Attendance> checkIn = attendanceRepository.findActiveByAction(employeeId, date, ACTION_MASUK)
                .filter(record -> REASON_ABSEN.equals(record.getReason()));
        boolean conflicts = checkIn
                .map(record -> afternoon
                        ? !record.getRecordedAt().isBefore(boundary)
                        : record.getRecordedAt().isBefore(boundary.minus(EARLY_OPEN)))
                .orElse(false);
        return conflicts ? attendanceRepository.deleteAbsenInRange(employeeId, date, date) : 0;
    }

    // ---------- util ----------

    // Setengah hari = kolom session terisi (PAGI / SIANG / HALF untuk Cuti Urgent).
    private boolean isHalfDay(LeaveRequest leave) {
        return leave.getSession() != null && !leave.getSession().isBlank();
    }

    private String typeName(LeaveRequest leave) {
        return leave.getLeaveType() == null ? "Cuti" : leave.getLeaveType().getName();
    }

    private boolean isShifting(Employee employee) {
        return employee.getDivisi() != null && "SHIFTING".equalsIgnoreCase(employee.getDivisi().getTipeDivisi());
    }

    private LocalDateTime halfDayBoundary(Employee employee, LocalDate workDate, WorkSchedule schedule) {
        if (!isShifting(employee) || schedule == null || schedule.getShift() == null) {
            return LocalDateTime.of(workDate, REGULAR_HALF_DAY_BOUNDARY);
        }
        LocalTime start = schedule.getShift().getStartTime();
        LocalTime end = schedule.getShift().getEndTime();
        long seconds = (end.toSecondOfDay() - start.toSecondOfDay() + SECONDS_PER_DAY) % SECONDS_PER_DAY;
        if (seconds == 0) seconds = DEFAULT_SHIFT_SECONDS;
        return LocalDateTime.of(workDate, start).plusSeconds(seconds / 2);
    }
}
