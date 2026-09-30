package sys.hris.sims.schedule.service;

import java.time.LocalDate;
import java.time.YearMonth;
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
import sys.hris.sims.schedule.dto.SchedulePublishRequest;
import sys.hris.sims.schedule.dto.SchedulePublishResult;
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

    private String key(Long employeeId, LocalDate date) {
        return employeeId + "|" + date;
    }
}
