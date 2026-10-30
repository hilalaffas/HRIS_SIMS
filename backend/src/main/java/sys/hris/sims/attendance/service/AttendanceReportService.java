package sys.hris.sims.attendance.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.dto.AttendanceReportResponse;
import sys.hris.sims.attendance.dto.AttendanceReportResponse.EmployeeReport;
import sys.hris.sims.attendance.dto.AttendanceReportResponse.LeaveEntry;
import sys.hris.sims.attendance.dto.AttendanceResponse;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.common.service.ReportScopeService;
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.overtime.dto.OvertimeResponse;
import sys.hris.sims.overtime.entity.OvertimeRequest;
import sys.hris.sims.overtime.repository.OvertimeRepository;
import sys.hris.sims.schedule.dto.ScheduleEntryResponse;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;

// [BARU] Laporan Absensi untuk HRD: absensi + jadwal shift + lembur semua
// karyawan aktif (atau satu divisi) pada satu rentang tanggal. Akses dibatasi
// di SecurityConfig (GET /api/absensi/laporan -> HRD_ADMIN, SUPER_ADMIN).
@Service
@RequiredArgsConstructor
public class AttendanceReportService {

    // Rentang maksimum satu laporan: satu periode tutup buku (21 s/d 20) + cadangan.
    private static final long MAX_RANGE_DAYS = 62;

    // Izin sakit multi-hari yang DIMULAI sebelum rentang masih bisa menutup hari di
    // dalam rentang, jadi absensi diambil mundur sebanyak ini.
    private static final long SICK_LOOKBACK_DAYS = 31;

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final OvertimeRepository overtimeRepository;
    private final LeaveRepository leaveRepository;
    private final AttendanceService attendanceService;
    private final ReportScopeService reportScopeService; // [BARU] sembunyikan superadmin & akun dev dari laporan

    @Transactional(readOnly = true)
    public AttendanceReportResponse buildReport(LocalDate from, LocalDate to, Long divisionId) {
        validateRange(from, to);

        // [UBAH] Akun SUPER_ADMIN & akun dev tidak ikut laporan: hanya karyawan asli.
        List<Employee> employees = reportScopeService.onlyReportableEmployees(
                divisionId == null
                        ? employeeRepository.findActiveForReport()
                        : employeeRepository.findActiveForReportByDivisi(divisionId));
        if (employees.isEmpty()) {
            return new AttendanceReportResponse(from, to, List.of());
        }

        List<Long> employeeIds = employees.stream().map(Employee::getEmployeeId).toList();

        Map<Long, List<AttendanceResponse>> attendancesByEmployee = attendanceRepository
                .findForReport(employeeIds, from.minusDays(SICK_LOOKBACK_DAYS), to)
                .stream()
                .map(attendanceService::toResponse)
                .collect(Collectors.groupingBy(AttendanceResponse::getEmployeeId));

        Map<Long, List<ScheduleEntryResponse>> schedulesByEmployee = workScheduleRepository
                .findByEmployee_EmployeeIdInAndWorkDateBetween(employeeIds, from, to)
                .stream()
                .map(ScheduleEntryResponse::from)
                .collect(Collectors.groupingBy(ScheduleEntryResponse::employeeId));

        Map<Long, List<OvertimeResponse>> overtimesByEmployee = overtimeRepository
                .findForReport(employeeIds, from, to)
                .stream()
                .map(this::toOvertimeResponse)
                .collect(Collectors.groupingBy(OvertimeResponse::getEmployeeId));

        Map<Long, List<LeaveEntry>> leavesByEmployee = leaveRepository
                .findApprovedForReport(employeeIds, from, to)
                .stream()
                .collect(Collectors.groupingBy(
                        leave -> leave.getEmployee().getEmployeeId(),
                        Collectors.mapping(this::toLeaveEntry, Collectors.toList())));

        List<EmployeeReport> reports = employees.stream()
                .map(employee -> toEmployeeReport(employee,
                        attendancesByEmployee, schedulesByEmployee, overtimesByEmployee, leavesByEmployee))
                .toList();

        return new AttendanceReportResponse(from, to, reports);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("Periode laporan wajib diisi");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("Tanggal akhir tidak boleh sebelum tanggal awal");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("Rentang laporan maksimal " + MAX_RANGE_DAYS + " hari");
        }
    }

    private EmployeeReport toEmployeeReport(Employee employee,
                                            Map<Long, List<AttendanceResponse>> attendances,
                                            Map<Long, List<ScheduleEntryResponse>> schedules,
                                            Map<Long, List<OvertimeResponse>> overtimes,
                                            Map<Long, List<LeaveEntry>> leaves) {
        Long employeeId = employee.getEmployeeId();
        Divisi division = employee.getDivisi();
        return new EmployeeReport(
                employeeId,
                employee.getFullName(),
                employee.getNikKaryawan(),
                employee.getPosition(),
                employee.getJoinDate(),
                division == null ? null : division.getId(),
                division == null ? null : division.getNamaDivisi(),
                division == null ? "REGULAR" : division.getTipeDivisi(),
                attendances.getOrDefault(employeeId, List.of()),
                schedules.getOrDefault(employeeId, List.of()),
                overtimes.getOrDefault(employeeId, List.of()),
                leaves.getOrDefault(employeeId, List.of()));
    }

    // Alasan & catatan cuti (teks bebas) sengaja TIDAK disertakan.
    private LeaveEntry toLeaveEntry(LeaveRequest leave) {
        return new LeaveEntry(
                leave.getStartDate(),
                leave.getEndDate(),
                leave.getTotalDays(),
                leave.getSession(),
                leave.getLeaveType() == null ? null : leave.getLeaveType().getName());
    }

    // Alasan lembur (teks bebas) sengaja TIDAK disertakan -- laporan absensi hanya
    // butuh tanggal, jam, durasi, dan status.
    private OvertimeResponse toOvertimeResponse(OvertimeRequest overtime) {
        return OvertimeResponse.builder()
                .overtimeId(overtime.getOvertimeId())
                .employeeId(overtime.getEmployee().getEmployeeId())
                .employeeName(overtime.getEmployee().getFullName())
                .overtimeDate(overtime.getOvertimeDate())
                .startTime(overtime.getStartTime())
                .endTime(overtime.getEndTime())
                .totalMinutes(overtime.getTotalMinutes())
                .status(overtime.getStatus())
                .createdAt(overtime.getCreatedAt())
                .build();
    }
}
