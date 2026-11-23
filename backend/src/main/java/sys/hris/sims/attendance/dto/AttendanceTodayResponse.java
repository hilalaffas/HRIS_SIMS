package sys.hris.sims.attendance.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

// [BARU] Response GET /api/absensi/today-summary -- ringkasan absensi HARI INI untuk panel
// "Absensi Hari Ini" di Dashboard HRD / Super Admin: karyawan yang sakit, terlambat, dan
// belum absen. Data dikirim mentah, pemformatan teks tampilan dilakukan di frontend.
public record AttendanceTodayResponse(
        LocalDate date,
        LocalDateTime generatedAt,
        List<Entry> sick,
        List<Entry> late,
        List<Entry> notCheckedIn) {

    // Satu karyawan. Field yang tidak relevan untuk suatu daftar bernilai null:
    //   sick         -> sickStart, sickEnd, approvalStatus
    //   late         -> checkInAt (null bila hanya izin terlambat), workStart, lateNotice
    //   notCheckedIn -> workStart
    public record Entry(
            Long employeeId,
            String employeeName,
            String divisionName,
            LocalDateTime checkInAt,
            LocalTime workStart,
            LocalDate sickStart,
            LocalDate sickEnd,
            String approvalStatus,
            boolean lateNotice) {
    }
}
