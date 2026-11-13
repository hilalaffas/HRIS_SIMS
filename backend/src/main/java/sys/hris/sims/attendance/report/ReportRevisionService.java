package sys.hris.sims.attendance.report;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sys.hris.sims.attendance.dto.AttendanceResponse;
import sys.hris.sims.attendance.dto.AttendanceReportResponse.EmployeeReport;
import sys.hris.sims.attendance.service.AttendanceReportService;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.schedule.dto.ScheduleEntryResponse;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;
import sys.hris.sims.shift.entity.Shift;

@Service
@RequiredArgsConstructor
public class ReportRevisionService {
    private final AttendanceReportService reports;
    private final ReportRevisionRepository revisions;
    private final EmployeeRepository employees;
    private final WorkScheduleRepository schedules;
    private final EntityManager entityManager;
    private static final ZoneId WIB = ZoneId.of("Asia/Jakarta");
    private static final Set<String> STATUSES = Set.of("TANPA KETERANGAN", "TERLAMBAT", "HADIR TEPAT WAKTU");

    public record EditRequest(LocalDate date, Long shiftId, Long expectedShiftId, String status, String note, String reason, Long expectedRevision) {}

    @Transactional
    public ReportRevision save(Long employeeId, EditRequest request, String username) {
        if (request == null || request.date() == null) throw new IllegalArgumentException("Tanggal wajib diisi.");
        if (request.reason() == null || request.reason().isBlank() || request.reason().length() > 1000)
            throw new IllegalArgumentException("Alasan perubahan wajib diisi, maksimal 1000 karakter.");
        Employee employee = entityManager.find(Employee.class, employeeId, LockModeType.PESSIMISTIC_WRITE);
        if (employee == null || employee.getJoinDate() != null && request.date().isBefore(employee.getJoinDate()))
            throw new IllegalArgumentException("Karyawan atau tanggal laporan tidak valid.");
        // [UBAH] Cukup laporan DIVISI karyawan ini (bukan semua karyawan) -- jauh lebih ringan di setiap simpan.
        Long divisionId = employee.getDivisi() == null ? null : employee.getDivisi().getId();
        EmployeeReport report = reports.buildReport(request.date(), request.date(), divisionId).employees().stream()
                .filter(item -> item.employeeId().equals(employeeId)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Karyawan tidak tersedia dalam laporan."));
        var previous = revisions.findFirstByEmployeeIdAndDateOrderByIdDesc(employeeId, request.date()).orElse(null);
        if (!Objects.equals(request.expectedRevision(), previous == null ? null : previous.getId()))
            throw new IllegalStateException("Laporan telah berubah. Muat ulang sebelum mengedit kembali.");
        var revision = new ReportRevision();
        revision.setEmployeeId(employeeId); revision.setDate(request.date());
        revision.setReason(request.reason().trim()); revision.setEditedBy(username);
        revision.setEditorName(employees.findFirstByUser_Username(username).map(Employee::getFullName).orElse(username));
        revision.setEditedAt(LocalDateTime.now(WIB));
        if (request.date().isAfter(LocalDate.now(WIB))) changeSchedule(report, request, revision, username);
        else changeReport(report, request, revision);
        return revisions.save(revision);
    }

    private void changeSchedule(EmployeeReport report, EditRequest request, ReportRevision revision, String username) {
        if (request.status() != null || request.note() != null)
            throw new IllegalArgumentException("Status dan keterangan belum dapat diubah untuk tanggal mendatang.");
        if (!"SHIFTING".equalsIgnoreCase(report.divisionType()))
            throw new IllegalArgumentException("Shift normal tidak dapat diganti.");
        var selected = report.shiftOptions().stream()
                .filter(s -> (s.date() == null || request.date().equals(s.date())) && s.shiftId() != null && s.shiftId().equals(request.shiftId())).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Shift tidak tersedia pada pengaturan divisi karyawan."));
        var schedule = schedules.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(report.employeeId(), request.date(), request.date())
                .stream().findFirst().orElseThrow(() -> new IllegalArgumentException("Jadwal karyawan belum dibuat pada tanggal tersebut."));
        entityManager.lock(schedule, LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(schedule);
        if (!request.date().isAfter(LocalDate.now(WIB))) throw new IllegalStateException("Tanggal jadwal sudah berjalan. Muat ulang laporan.");
        Long currentId = schedule.getShift() == null ? null : schedule.getShift().getShiftId();
        if (!Objects.equals(currentId, request.expectedShiftId()))
            throw new IllegalStateException("Jadwal asli sudah berubah. Muat ulang laporan.");
        if (Objects.equals(currentId, request.shiftId())) throw new IllegalArgumentException("Tidak ada perubahan shift.");
        revision.setScheduleChange(true);
        revision.setBeforeShift(shiftLabel(ScheduleEntryResponse.from(schedule), true));
        revision.setAfterShift(shiftLabel(selected, true));
        schedule.setShift(entityManager.getReference(Shift.class, selected.shiftId()));
        schedule.setPublishedBy(username);
        schedules.save(schedule);
    }

    private void changeReport(EmployeeReport report, EditRequest request, ReportRevision revision) {
        if (request.shiftId() != null) throw new IllegalArgumentException("Shift hari ini atau sebelumnya tidak dapat diganti.");
        if (request.note() == null || request.note().length() > 2000) throw new IllegalArgumentException("Keterangan maksimal 2000 karakter.");
        boolean protectedStatus = isProtected(report, request.date());
        if (request.status() != null && (protectedStatus || !STATUSES.contains(request.status())))
            throw new IllegalArgumentException("Status hanya boleh Alpha, Terlambat, atau Hadir Tepat Waktu; Sakit/Izin/Cuti mengikuti approval.");
        var last = report.revisions().stream().filter(r -> r.getDate().equals(request.date()) && !r.isScheduleChange())
                .max(Comparator.comparing(ReportRevision::getId)).orElse(null);
        var dayRecords = report.attendances().stream().filter(a -> a.getAttendanceDate().equals(request.date())).toList();
        var checkIn = dayRecords.stream().filter(a -> "MASUK".equals(a.getAction()) && "ABSEN".equals(a.getReason())).findFirst().orElse(null);
        String status = checkIn == null ? request.date().equals(LocalDate.now(WIB)) ? "BELUM ABSEN" : "TANPA KETERANGAN"
                : "LATE".equals(checkIn.getStatus()) ? "TERLAMBAT" : "HADIR TEPAT WAKTU";
        String note = defaultNote(dayRecords, checkIn, request.date());
        if (protectedStatus) {
            var sick = report.attendances().stream().filter(a -> "SAKIT".equals(a.getReason()) && coversPermission(a, request.date())).findFirst();
            var leave = report.leaves().stream().filter(l -> !request.date().isBefore(l.startDate()) && !request.date().isAfter(l.endDate())).findFirst();
            status = sick.isPresent() ? "PENDING".equals(sick.get().getApprovalStatus()) ? "MENUNGGU APPROVAL" : "SAKIT"
                    : leave.isPresent() ? "CUTI" : "IZIN";
            if (checkIn == null) note = sick.isPresent() ? "PENDING".equals(sick.get().getApprovalStatus()) ? "Izin sakit (menunggu persetujuan)" : "Izin sakit"
                    : leave.isPresent() ? "Cuti: " + leave.get().leaveTypeName() : "Izin";
        }
        String beforeStatus = last == null || protectedStatus ? status : last.getAfterStatus();
        String beforeNote = last == null ? note : last.getAfterNote();
        String afterStatus = request.status() == null ? beforeStatus : request.status();
        if (Objects.equals(beforeStatus, afterStatus) && Objects.equals(beforeNote, request.note().trim()))
            throw new IllegalArgumentException("Tidak ada perubahan untuk disimpan.");
        var schedule = report.schedules().stream().filter(s -> s.date().equals(request.date())).findFirst().orElse(null);
        String label = shiftLabel(schedule, "SHIFTING".equalsIgnoreCase(report.divisionType()));
        revision.setBeforeShift(label); revision.setAfterShift(label);
        revision.setBeforeStatus(beforeStatus); revision.setAfterStatus(afterStatus);
        revision.setBeforeNote(beforeNote); revision.setAfterNote(request.note().trim());
    }

    static boolean isProtected(EmployeeReport report, LocalDate date) {
        return report.leaves().stream().anyMatch(l -> !date.isBefore(l.startDate()) && !date.isAfter(l.endDate()))
                || report.attendances().stream().anyMatch(a -> coversPermission(a, date));
    }
    private static boolean coversPermission(AttendanceResponse record, LocalDate date) {
        if ("REJECTED".equals(record.getApprovalStatus()) || record.getAttendanceDate() == null) return false;
        if ("IZIN".equals(record.getReason())) return date.equals(record.getAttendanceDate());
        if (!"SAKIT".equals(record.getReason())) return false;
        if (record.getSickStartDate() != null && record.getSickEndDate() != null)
            return !date.isBefore(record.getSickStartDate()) && !date.isAfter(record.getSickEndDate());
        LocalDate start = record.getAttendanceDate(), end = start;
        int days = record.getLeaveDays() == null ? 1 : Math.max(1, (int) Math.ceil(record.getLeaveDays()));
        for (int counted = 1; counted < days;) { end = end.plusDays(1); if (end.getDayOfWeek().getValue() < 6) counted++; }
        return !date.isBefore(start) && !date.isAfter(end) && (date.equals(start) || date.getDayOfWeek().getValue() < 6);
    }
    private String shiftLabel(ScheduleEntryResponse s, boolean shifting) {
        if (!shifting) return "Shift Normal (08:00 - 17:00)";
        return s == null ? "Belum dipublikasikan" : s.shiftName() == null ? "Libur" : s.shiftName() + " (" + s.startTime() + " - " + s.endTime() + ")";
    }
    private String defaultNote(List<AttendanceResponse> records, AttendanceResponse checkIn, LocalDate date) {
        String note = date.equals(LocalDate.now(WIB)) ? "Menunggu Absen Masuk" : "Tanpa Keterangan (Alpha)";
        if (checkIn != null) {
            long late = Math.max(0, ChronoUnit.MINUTES.between(date.atTime(8, 0), checkIn.getRecordedAt()));
            note = "LATE".equals(checkIn.getStatus()) ? late > 0 ? "Terlambat " + late + " Menit" : "Terlambat" : "Bekerja Normal";
            var checkout = records.stream().filter(a -> "KELUAR".equals(a.getAction())).findFirst();
            if (checkout.isEmpty()) note += date.equals(LocalDate.now(WIB)) ? " (Sedang Bekerja)" : " (Tidak Absen Pulang)";
            else if (checkout.get().getNote() != null && !checkout.get().getNote().isBlank()) note += " · " + checkout.get().getNote();
        }
        var lateNotice = records.stream().filter(a -> "IZIN".equals(a.getAction())).findFirst();
        if (lateNotice.isPresent()) note += " · Izin terlambat: " + lateNotice.get().getNote();
        return note;
    }
}
