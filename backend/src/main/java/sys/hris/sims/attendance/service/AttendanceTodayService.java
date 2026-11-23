package sys.hris.sims.attendance.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.dto.AttendanceTodayPublicResponse; // [BARU]
import sys.hris.sims.attendance.dto.AttendanceTodayResponse;
import sys.hris.sims.attendance.dto.AttendanceTodayResponse.Entry;
import sys.hris.sims.attendance.entity.Attendance;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.common.service.ReportScopeService;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.holiday.repository.HolidayRepository;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;
import sys.hris.sims.schedule.workhours.WorkHours;
import sys.hris.sims.schedule.workhours.WorkHoursResolver;

// [BARU] Ringkasan absensi HARI INI (sakit / terlambat / belum absen) untuk Dashboard HRD & Super Admin.
// Aturan dipakai ulang dari modul yang sudah ada, bukan hitungan baru:
//   - sakit        : SickPeriod.covers + SickDocumentDeadline.expired (sama seperti AttendanceService)
//   - terlambat    : absen masuk berstatus LATE (hasil AttendanceService.resolveStatus; yang sudah
//                    dikoreksi HRD menjadi ON_TIME otomatis tidak ikut) atau pemberitahuan "Izin Terlambat"
//   - belum absen  : hari kerja (Shifting: ada shift di jadwal; Regular: bukan Sabtu/Minggu/libur),
//                    jam masuk sudah lewat, belum ada absen masuk, tidak sedang sakit / cuti.
// Hanya membaca data dengan query massal (tanpa N+1): satu query karyawan, absensi, jadwal, dan cuti.
@Service
@RequiredArgsConstructor
public class AttendanceTodayService {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Jakarta");

    // Sakit multi-hari lama (tanpa tanggal akhir eksplisit) masih bisa menutup hari ini.
    private static final long SICK_LOOKBACK_DAYS = 45;

    private static final Comparator<Entry> BY_NAME = Comparator.comparing(
            (Entry entry) -> entry.employeeName() == null ? "" : entry.employeeName(),
            String.CASE_INSENSITIVE_ORDER);

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final LeaveRepository leaveRepository;
    private final HolidayRepository holidayRepository;
    private final ReportScopeService reportScopeService; // superadmin & akun dev tidak ikut daftar

    @Transactional(readOnly = true)
    public AttendanceTodayResponse buildToday() {
        LocalDateTime now = LocalDateTime.now(APP_ZONE);
        LocalDate today = now.toLocalDate();

        List<Employee> employees = reportScopeService.onlyReportableEmployees(
                employeeRepository.findActiveForReport());
        if (employees.isEmpty()) {
            return new AttendanceTodayResponse(today, now, List.of(), List.of(), List.of());
        }
        List<Long> employeeIds = employees.stream().map(Employee::getEmployeeId).toList();
        Set<Long> reportableIds = new HashSet<>(employeeIds);

        Map<Long, List<Attendance>> recordsByEmployee = attendanceRepository
                .findForTodayStatus(today, today.minusDays(SICK_LOOKBACK_DAYS))
                .stream()
                .filter(record -> reportableIds.contains(record.getEmployee().getEmployeeId()))
                .collect(Collectors.groupingBy(record -> record.getEmployee().getEmployeeId()));

        Map<Long, WorkSchedule> scheduleByEmployee = workScheduleRepository
                .findByEmployee_EmployeeIdInAndWorkDateBetween(employeeIds, today, today)
                .stream()
                .collect(Collectors.toMap(schedule -> schedule.getEmployee().getEmployeeId(),
                        Function.identity(), (first, second) -> first));

        // Cuti sehari penuh & cuti setengah hari PAGI: belum wajib absen (cuti setengah hari
        // SIANG tetap wajib absen pagi, jadi tidak dikecualikan).
        Set<Long> excusedFromCheckIn = leaveRepository.findApprovedForReport(employeeIds, today, today)
                .stream()
                .filter(leave -> !isAfternoonHalfDay(leave))
                .map(leave -> leave.getEmployee().getEmployeeId())
                .collect(Collectors.toSet());

        boolean nonWorkingDayForRegular = isWeekend(today) || holidayRepository.existsByDate(today);

        List<Entry> sick = new ArrayList<>();
        List<Entry> late = new ArrayList<>();
        List<Entry> notCheckedIn = new ArrayList<>();

        for (Employee employee : employees) {
            Long employeeId = employee.getEmployeeId();
            List<Attendance> records = recordsByEmployee.getOrDefault(employeeId, List.of());
            WorkSchedule schedule = scheduleByEmployee.get(employeeId);
            WorkHours workHours = WorkHoursResolver.resolve(employee, today, schedule);

            Attendance sickRecord = records.stream()
                    .filter(record -> SickPeriod.covers(record, today)
                            && !SickDocumentDeadline.expired(record, today))
                    .findFirst().orElse(null);
            if (sickRecord != null) {
                sick.add(sickEntry(employee, sickRecord));
                continue; // yang sakit tidak dihitung terlambat / belum absen
            }

            Attendance checkIn = records.stream()
                    .filter(record -> today.equals(record.getAttendanceDate())
                            && "MASUK".equals(record.getAction()) && "ABSEN".equals(record.getReason()))
                    .findFirst().orElse(null);
            if (checkIn != null) {
                if ("LATE".equals(checkIn.getStatus())) {
                    late.add(lateEntry(employee, checkIn, workHours, false));
                }
                continue;
            }

            Attendance lateNotice = records.stream()
                    .filter(record -> today.equals(record.getAttendanceDate())
                            && "IZIN".equals(record.getAction()) && "IZIN".equals(record.getReason()))
                    .findFirst().orElse(null);
            if (lateNotice != null) {
                late.add(lateEntry(employee, lateNotice, workHours, true));
                continue; // sudah memberi kabar terlambat -> bukan "belum absen"
            }

            if (isWorkingDay(employee, schedule, nonWorkingDayForRegular)
                    && !excusedFromCheckIn.contains(employeeId)
                    && !now.isBefore(workHours.startAt(today))) {
                notCheckedIn.add(new Entry(employeeId, employee.getFullName(), divisionName(employee),
                        null, workHours.start(), null, null, null, false));
            }
        }

        sick.sort(BY_NAME);
        late.sort(BY_NAME);
        notCheckedIn.sort(BY_NAME);
        return new AttendanceTodayResponse(today, now, sick, late, notCheckedIn);
    }

    // [BARU] Versi ringkas untuk Dashboard semua role: hanya yang sakit & izin terlambat hari ini.
    // Memakai ulang buildToday() supaya aturan sakit/izin tetap satu sumber, lalu membuang field
    // sensitif (id, divisi, status persetujuan) sebelum dikirim ke rekan kerja.
    @Transactional(readOnly = true)
    public AttendanceTodayPublicResponse buildTodayPublic() {
        AttendanceTodayResponse full = buildToday();
        List<AttendanceTodayPublicResponse.Person> sick = full.sick().stream()
                .map(entry -> new AttendanceTodayPublicResponse.Person(
                        entry.employeeName(), entry.sickStart(), entry.sickEnd()))
                .toList();
        List<AttendanceTodayPublicResponse.Person> permission = full.late().stream()
                .filter(Entry::lateNotice)
                .map(entry -> new AttendanceTodayPublicResponse.Person(entry.employeeName(), null, null))
                .toList();
        return new AttendanceTodayPublicResponse(full.date(), full.generatedAt(), sick, permission);
    }

    // Divisi Shifting: hari kerja = ada shift di jadwal (shift null = OFF). Lainnya: bukan akhir pekan/libur.
    private boolean isWorkingDay(Employee employee, WorkSchedule schedule, boolean nonWorkingDayForRegular) {
        if (WorkHoursResolver.isShifting(employee)) {
            return schedule != null && schedule.getShift() != null;
        }
        return !nonWorkingDayForRegular;
    }

    private boolean isWeekend(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }

    // Kolom session terisi = cuti setengah hari; SIANG = siang, sisanya (PAGI / HALF) = pagi.
    private boolean isAfternoonHalfDay(LeaveRequest leave) {
        return leave.getSession() != null && "SIANG".equalsIgnoreCase(leave.getSession().trim());
    }

    private Entry sickEntry(Employee employee, Attendance record) {
        LocalDate start = record.getSickStartDate() != null ? record.getSickStartDate() : record.getAttendanceDate();
        LocalDate end = record.getSickEndDate() != null ? record.getSickEndDate() : start;
        return new Entry(employee.getEmployeeId(), employee.getFullName(), divisionName(employee),
                null, null, start, end, record.getApprovalStatus(), false);
    }

    private Entry lateEntry(Employee employee, Attendance record, WorkHours workHours, boolean lateNotice) {
        return new Entry(employee.getEmployeeId(), employee.getFullName(), divisionName(employee),
                lateNotice ? null : record.getRecordedAt(), workHours.start(), null, null, null, lateNotice);
    }

    private String divisionName(Employee employee) {
        return employee.getDivisi() == null ? null : employee.getDivisi().getNamaDivisi();
    }
}
