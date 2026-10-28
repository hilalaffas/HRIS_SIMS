package sys.hris.sims.schedule.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.schedule.dto.ScheduleEntryRequest;
import sys.hris.sims.schedule.dto.ScheduleEntryResponse;
import sys.hris.sims.schedule.dto.MyWorkScheduleResponse;
import sys.hris.sims.schedule.dto.SchedulePublishRequest;
import sys.hris.sims.schedule.dto.SchedulePublishResult;
import sys.hris.sims.schedule.dto.ScheduleResetRequest;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;
import sys.hris.sims.shift.entity.Shift;
import sys.hris.sims.shift.repository.ShiftRepository;

@Service
public class WorkScheduleService {

    // Pengaman ukuran request: ~500 karyawan x 31 hari.
    private static final int MAX_ENTRIES = 16000;

    private final WorkScheduleRepository scheduleRepository;
    private final EmployeeRepository employeeRepository;
    private final ShiftRepository shiftRepository;

    public WorkScheduleService(WorkScheduleRepository scheduleRepository,
                               EmployeeRepository employeeRepository,
                               ShiftRepository shiftRepository) {
        this.scheduleRepository = scheduleRepository;
        this.employeeRepository = employeeRepository;
        this.shiftRepository = shiftRepository;
    }

    // readOnly: mapping ke DTO menyentuh relasi lazy (employee, shift).
    @Transactional(readOnly = true)
    public List<ScheduleEntryResponse> getByMonth(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        return scheduleRepository
                .findByWorkDateBetweenOrderByWorkDateAsc(ym.atDay(1), ym.atEndOfMonth())
                .stream()
                .map(ScheduleEntryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public MyWorkScheduleResponse getMyByMonth(String username, int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        Employee employee = employeeRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new IllegalStateException("Data karyawan tidak ditemukan untuk user ini"));
        List<ScheduleEntryResponse> schedules = scheduleRepository.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
                        employee.getEmployeeId(), ym.atDay(1), ym.atEndOfMonth())
                .stream().map(ScheduleEntryResponse::from).toList();
        String divisionType = employee.getDivisi() == null ? "REGULAR" : employee.getDivisi().getTipeDivisi();
        String divisionName = employee.getDivisi() == null ? null : employee.getDivisi().getNamaDivisi();
        return new MyWorkScheduleResponse(divisionType, divisionName, schedules);
    }

    // Upsert: entri yang sudah ada (karyawan + tanggal sama) ditimpa.
    @Transactional
    public SchedulePublishResult publish(SchedulePublishRequest request, String publishedBy) {
        List<ScheduleEntryRequest> entries = request == null ? null : request.entries();
        if (entries == null || entries.isEmpty()) {
            throw new IllegalArgumentException("Tidak ada jadwal untuk dipublish");
        }
        if (entries.size() > MAX_ENTRIES) {
            throw new IllegalArgumentException("Jumlah jadwal terlalu besar dalam satu kali publish");
        }

        Set<Long> employeeIds = new HashSet<>();
        LocalDate minDate = null;
        LocalDate maxDate = null;
        for (ScheduleEntryRequest e : entries) {
            if (e.employeeId() == null || e.date() == null) {
                throw new IllegalArgumentException("Data jadwal tidak lengkap");
            }
            employeeIds.add(e.employeeId());
            if (minDate == null || e.date().isBefore(minDate)) minDate = e.date();
            if (maxDate == null || e.date().isAfter(maxDate)) maxDate = e.date();
        }

        Map<Long, Employee> employees = employeeRepository.findAllById(employeeIds).stream()
                .collect(Collectors.toMap(Employee::getEmployeeId, e -> e));
        if (employees.size() != employeeIds.size()) {
            throw new IllegalArgumentException("Ada karyawan yang tidak ditemukan");
        }

        Map<Long, Shift> shifts = shiftRepository.findAll().stream()
                .collect(Collectors.toMap(Shift::getShiftId, s -> s));

        Set<String> entryKeys = new HashSet<>();
        for (ScheduleEntryRequest entry : entries) {
            Employee employee = employees.get(entry.employeeId());
            if (employee.getDivisi() == null || !"SHIFTING".equalsIgnoreCase(employee.getDivisi().getTipeDivisi())) {
                throw new IllegalArgumentException("Jadwal publish hanya berlaku untuk divisi Non Regular (Shift).");
            }
            if (entry.shiftId() != null) {
                Shift shift = shifts.get(entry.shiftId());
                if (shift == null || !employee.getDivisi().getId().equals(shift.getDivisionId())) {
                    throw new IllegalArgumentException("Shift yang dipilih tidak sesuai dengan divisi karyawan.");
                }
            }
            if (!entryKeys.add(key(entry.employeeId(), entry.date()))) {
                throw new IllegalArgumentException("Ada tanggal jadwal yang sama lebih dari satu kali untuk karyawan.");
            }
        }

        validateShiftRoster(entries, employees, shifts);

        // Baris lama pada rentang yang sama, diindeks "employeeId|date".
        Map<String, WorkSchedule> existing = new HashMap<>();
        for (WorkSchedule ws : scheduleRepository
                .findByEmployee_EmployeeIdInAndWorkDateBetween(employeeIds, minDate, maxDate)) {
            existing.put(key(ws.getEmployee().getEmployeeId(), ws.getWorkDate()), ws);
        }

        int created = 0;
        int updated = 0;
        for (ScheduleEntryRequest e : entries) {
            Shift shift = null;
            if (e.shiftId() != null) {
                shift = shifts.get(e.shiftId());
                if (shift == null) {
                    throw new IllegalArgumentException("Shift tidak ditemukan");
                }
            }

            WorkSchedule ws = existing.get(key(e.employeeId(), e.date()));
            if (ws == null) {
                ws = new WorkSchedule();
                ws.setEmployee(employees.get(e.employeeId()));
                ws.setWorkDate(e.date());
                existing.put(key(e.employeeId(), e.date()), ws);
                created++;
            } else {
                updated++;
            }
            ws.setShift(shift);
            ws.setPublishedBy(publishedBy);
            scheduleRepository.save(ws);
        }

        return new SchedulePublishResult(created, updated);
    }

    @Transactional
    public long reset(ScheduleResetRequest request) {
        if (request == null || request.employeeIds() == null || request.employeeIds().isEmpty()) {
            throw new IllegalArgumentException("Pilih karyawan Non Regular yang jadwalnya akan direset.");
        }
        YearMonth ym;
        try {
            ym = YearMonth.of(request.year(), request.month());
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException("Periode bulan tidak valid.");
        }

        Set<Long> employeeIds = new HashSet<>(request.employeeIds());
        Map<Long, Employee> employees = employeeRepository.findAllById(employeeIds).stream()
                .collect(Collectors.toMap(Employee::getEmployeeId, employee -> employee));
        if (employees.size() != employeeIds.size()) {
            throw new IllegalArgumentException("Ada karyawan yang tidak ditemukan.");
        }
        boolean containsRegular = employees.values().stream()
                .anyMatch(employee -> employee.getDivisi() == null
                        || !"SHIFTING".equalsIgnoreCase(employee.getDivisi().getTipeDivisi()));
        if (containsRegular) {
            throw new IllegalArgumentException("Reset jadwal hanya tersedia untuk karyawan divisi Non Regular (Shift).");
        }
        return scheduleRepository.deleteByEmployee_EmployeeIdInAndWorkDateBetween(
                employeeIds, ym.atDay(1), ym.atEndOfMonth());
    }

    private String key(Long employeeId, LocalDate date) {
        return employeeId + "|" + date;
    }

    private void validateShiftRoster(List<ScheduleEntryRequest> entries,
                                     Map<Long, Employee> employees,
                                     Map<Long, Shift> shifts) {
        Map<String, WeeklyRoster> weeks = new HashMap<>();
        Map<Long, List<ShiftInterval>> intervalsByEmployee = new HashMap<>();

        for (ScheduleEntryRequest entry : entries) {
            Employee employee = employees.get(entry.employeeId());
            LocalDate monday = entry.date().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            String weekKey = entry.employeeId() + "|" + monday;
            WeeklyRoster week = weeks.computeIfAbsent(weekKey, ignored -> new WeeklyRoster());
            if (entry.shiftId() == null) {
                week.hasRestDay = true;
                continue;
            }

            Shift shift = shifts.get(entry.shiftId());
            long minutes = shiftDurationMinutes(shift);
            week.workMinutes += minutes;

            LocalDateTime start = LocalDateTime.of(entry.date(), shift.getStartTime());
            LocalDateTime end = LocalDateTime.of(entry.date(), shift.getEndTime());
            if (!shift.getEndTime().isAfter(shift.getStartTime())) {
                end = end.plusDays(1);
            }
            intervalsByEmployee.computeIfAbsent(employee.getEmployeeId(), ignored -> new ArrayList<>())
                    .add(new ShiftInterval(start, end));
        }

        for (Map.Entry<String, WeeklyRoster> item : weeks.entrySet()) {
            WeeklyRoster week = item.getValue();
            if (week.workMinutes > 40 * 60) {
                throw new IllegalArgumentException("Jadwal shift melewati batas 40 jam kerja per minggu untuk karyawan "
                        + item.getKey().substring(0, item.getKey().indexOf('|')) + ".");
            }
            if (!week.hasRestDay) {
                throw new IllegalArgumentException("Setiap karyawan wajib memiliki minimal 1 hari libur pada setiap minggu jadwal.");
            }
        }

        for (Map.Entry<Long, List<ShiftInterval>> item : intervalsByEmployee.entrySet()) {
            List<ShiftInterval> intervals = item.getValue();
            intervals.sort(Comparator.comparing(ShiftInterval::start));
            for (int i = 1; i < intervals.size(); i++) {
                if (intervals.get(i - 1).end().isAfter(intervals.get(i).start())) {
                    throw new IllegalArgumentException("Jadwal shift karyawan " + item.getKey()
                            + " bentrok/overlap dengan shift pada tanggal berikutnya.");
                }
            }
        }
    }

    private long shiftDurationMinutes(Shift shift) {
        LocalTime start = shift.getStartTime();
        LocalTime end = shift.getEndTime();
        long minutes = (end.toSecondOfDay() - start.toSecondOfDay() + 24L * 60 * 60) % (24L * 60 * 60) / 60;
        if (minutes <= 0 || minutes > 12 * 60) {
            throw new IllegalArgumentException("Durasi shift tidak valid. Periksa pengaturan shift divisi.");
        }
        return minutes;
    }

    private static class WeeklyRoster {
        private long workMinutes;
        private boolean hasRestDay;
    }

    private record ShiftInterval(LocalDateTime start, LocalDateTime end) { }
}
