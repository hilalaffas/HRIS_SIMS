package sys.hris.sims.attendance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import sys.hris.sims.overtime.dto.OvertimeResponse;
import sys.hris.sims.schedule.dto.ScheduleEntryResponse;

// [BARU] Response Laporan Absensi (HRD). Data dikirim MENTAH per karyawan
// (absensi + jadwal shift + lembur + cuti disetujui); baris harian & ringkasan disusun di
// frontend dengan logika yang sama seperti halaman Absensi karyawan
// (pages/Absensi/utils/monthlyAttendance.js) supaya angkanya konsisten.
public record AttendanceReportResponse(LocalDate from, LocalDate to, List<EmployeeReport> employees) {

    public record EmployeeReport(
            Long employeeId,
            String fullName,
            String nik,
            String position,
            LocalDate joinDate,
            Long divisionId,
            String divisionName,
            String divisionType,
            List<AttendanceResponse> attendances,
            List<ScheduleEntryResponse> schedules,
            List<OvertimeResponse> overtimes,
            List<LeaveEntry> leaves) {
    }

    // Cuti yang sudah DISETUJUI (data mentah; sesi hanya terisi untuk cuti setengah hari).
    public record LeaveEntry(LocalDate startDate, LocalDate endDate, BigDecimal totalDays,
                             String session, String leaveTypeName) {
    }
}
