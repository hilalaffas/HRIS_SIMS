package sys.hris.sims.attendance.service;

import java.time.DayOfWeek;
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
import sys.hris.sims.holiday.repository.HolidayRepository; // [BARU] libur nasional
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;
import sys.hris.sims.schedule.workhours.WorkHoursResolver; // [BARU]

// [BARU] SATU sumber aturan hubungan CUTI <-> ABSENSI (backend adalah sumber kebenaran,
// UI hanya cerminannya):
//   1. Cuti sehari penuh / multi-hari yang sudah DISETUJUI -> absen masuk & keluar ditolak.
//   2. Cuti setengah hari PAGI (dan Cuti Urgent setengah hari, kode "HALF") -> absen masuk
//      dibuka SATU JAM sebelum cuti berakhir (cuti sampai 13:00 -> absen mulai 12:00).
//   3. Cuti setengah hari SIANG -> bekerja sesi pertama; jam pulang mengikuti akhir sesi tersebut.
//   0. [BARU] Cuti TIDAK berlaku di hari libur/OFF: Sabtu, Minggu, libur nasional (Regular) atau
//      hari OFF (Shifting) tetap berstatus LIBUR walau tercakup rentang cuti (lihat isNonWorkingDay).
//   4. Cuti PENDING tidak memblokir absen. Begitu cuti DISETUJUI, absen yang terlanjur
//      tercatat di tanggal cuti dihapus (lihat reconcileOnApproval) dan hari itu tampil
//      sebagai CUTI di laporan.
@Service
@RequiredArgsConstructor
public class LeaveAttendancePolicy {

    public enum Mode { NONE, FULL_DAY, HALF_MORNING, HALF_AFTERNOON }

    // boundary = batas pagi/siang; opensAt = awal absen masuk dibuka (hanya HALF_MORNING).
    public record LeaveToday(Mode mode, String leaveTypeName, LocalDateTime boundary, LocalDateTime opensAt,
                             Long leaveRequestId, LocalDate workDate, LocalDateTime workStart, LocalDateTime workEnd, long requiredMinutes) {
        public static final LeaveToday NONE = new LeaveToday(Mode.NONE,null,null,null,null,null,null,null,0);
        public boolean isHalfDay() { return mode == Mode.HALF_MORNING || mode == Mode.HALF_AFTERNOON; }
    }

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
    private final HolidayRepository holidayRepository; // [BARU] cek hari libur nasional

    // ---------- status cuti pada satu tanggal ----------

    // `schedule` = jadwal karyawan di tanggal itu (boleh null). Hanya dipakai divisi Shifting.
    @Transactional(readOnly = true)
    public LeaveToday resolve(Employee employee, LocalDate workDate, WorkSchedule schedule) {
        List<LeaveRequest> leaves = leaveRepository.findApprovedCovering(employee.getEmployeeId(), workDate).stream().filter(l -> !l.cancelledOn(workDate)).toList();
        if (leaves.isEmpty()) return LeaveToday.NONE;

        // [BARU] Hari libur / OFF MENGALAHKAN cuti. Cuti multi-hari (mis. 27-30) yang melewati
        // Sabtu/Minggu/libur nasional tidak boleh membuat hari itu tampil "Sedang Cuti" atau
        // memblokir absen lembur hari libur -- sama seperti penghitungan jatah cuti (hari libur
        // tidak memotong saldo).
        if (isNonWorkingDay(employee, workDate, schedule)) return LeaveToday.NONE;

        // Cuti sehari penuh menang atas setengah hari bila keduanya mencakup tanggal yang sama.
        Optional<LeaveRequest> fullDay = leaves.stream().filter(leave -> !isHalfDay(leave)).findFirst();
        if (fullDay.isPresent()) {
            return new LeaveToday(Mode.FULL_DAY, typeName(fullDay.get()), null, null, fullDay.get().getLeaveRequestId(), workDate, null, null, 0);
        }

        LeaveRequest half = leaves.get(0);
        var session = HalfDayWorkSession.resolve(sys.hris.sims.schedule.workhours.WorkHoursResolver.resolve(employee,workDate,schedule), workDate, SESSION_AFTERNOON.equalsIgnoreCase(half.getSession()));
        boolean afternoon=SESSION_AFTERNOON.equalsIgnoreCase(half.getSession());
        return new LeaveToday(afternoon ? Mode.HALF_AFTERNOON : Mode.HALF_MORNING, typeName(half),
                afternoon ? session.end() : session.start(), afternoon ? null : session.start().minus(EARLY_OPEN),
                half.getLeaveRequestId(), workDate, session.start(), session.end(), session.minutes());
    }

    // Melempar IllegalStateException (pesan tampil di UI) bila absen belum boleh dilakukan.
    public void assertCanAttend(LeaveToday leave, String action, LocalDateTime now) {
        if (leave.mode() == Mode.FULL_DAY) {
            throw new IllegalStateException(
                    "Anda sedang cuti hari ini (" + leave.leaveTypeName() + "). Absensi tidak diperlukan.");
        }
        if (leave.mode() == Mode.HALF_AFTERNOON && ACTION_MASUK.equals(action) && !now.isBefore(leave.workEnd())) {
            throw new IllegalStateException("Sesi kerja sebelum cuti siang sudah selesai. Batalkan cuti hari ini bila ingin kembali bekerja.");
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
            // [UBAH] Hanya HARI KERJA yang dihapus absennya. Absen di hari libur/OFF (lembur hari
            // libur yang sudah disetujui) tetap aman walau tanggalnya tercakup rentang cuti.
            int deleted = 0;
            for (LocalDate date = cuti.getStartDate(); !date.isAfter(cuti.getEndDate()); date = date.plusDays(1)) {
                if (isNonWorkingDay(employee, date, null)) continue;
                deleted += attendanceRepository.deleteAbsenInRange(employeeId, date, date);
            }
            return deleted;
        }

        LocalDate date = cuti.getStartDate();
        WorkSchedule schedule = workScheduleRepository
                .findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(employeeId, date, date)
                .stream().findFirst().orElse(null);
        LocalDateTime boundary = halfDayBoundary(employee, date, schedule);
        boolean afternoon = SESSION_AFTERNOON.equalsIgnoreCase(cuti.getSession());
        if (afternoon) boundary = HalfDayWorkSession.resolve(sys.hris.sims.schedule.workhours.WorkHoursResolver.resolve(employee,date,schedule),date,true).end();
        final LocalDateTime attendanceBoundary = boundary;

        Optional<Attendance> checkIn = attendanceRepository.findActiveByAction(employeeId, date, ACTION_MASUK)
                .filter(record -> REASON_ABSEN.equals(record.getReason()));
        boolean conflicts = checkIn
                .map(record -> afternoon
                        ? !record.getRecordedAt().isBefore(attendanceBoundary)
                        : record.getRecordedAt().isBefore(attendanceBoundary.minus(EARLY_OPEN)))
                .orElse(false);
        return conflicts ? attendanceRepository.deleteAbsenInRange(employeeId, date, date) : 0;
    }

    @Transactional
    public void clearCancelledSession(Employee employee, LocalDate date) {
        WorkSchedule schedule = workScheduleRepository.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(employee.getEmployeeId(),date,date).stream().findFirst().orElse(null);
        var hours = sys.hris.sims.schedule.workhours.WorkHoursResolver.resolve(employee,date,schedule);
        for (String action : List.of("MASUK","KELUAR")) {
            attendanceRepository.findActiveByAction(employee.getEmployeeId(),date,action).ifPresent(record -> {
                if (!"ABSEN".equals(record.getReason())) return;
                record.setScheduledWorkStart(null); record.setScheduledWorkEnd(null); record.setScheduledWorkMinutes(null);
                if ("MASUK".equals(action)) record.setStatus(record.getRecordedAt().isAfter(hours.startAt(date)) ? "LATE" : "ON_TIME");
                attendanceRepository.save(record);
            });
        }
    }

    // ---------- util ----------

    // [BARU] Hari non-kerja -- aturan yang SAMA dengan LeaveService.listWorkingDays (hari cuti)
    // dan AttendanceTodayService.isWorkingDay:
    //   Regular  = Sabtu / Minggu / libur nasional
    //   Shifting = hari OFF di jadwal (baris jadwal ada, tetapi tanpa shift). Jadwal yang belum
    //              dipublikasikan TIDAK dianggap libur (perilaku lama dipertahankan).
    // `schedule` boleh null; untuk Shifting akan dicari sendiri.
    public boolean isNonWorkingDay(Employee employee, LocalDate date, WorkSchedule schedule) {
        if (WorkHoursResolver.isShifting(employee)) {
            WorkSchedule day = schedule != null ? schedule
                    : workScheduleRepository.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
                            employee.getEmployeeId(), date, date).stream().findFirst().orElse(null);
            return day != null && day.getShift() == null;
        }
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        return dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY
                || holidayRepository.existsByDate(date);
    }

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
        return HalfDayWorkSession.resolve(sys.hris.sims.schedule.workhours.WorkHoursResolver.resolve(employee,workDate,schedule),workDate,false).start();
    }
}
