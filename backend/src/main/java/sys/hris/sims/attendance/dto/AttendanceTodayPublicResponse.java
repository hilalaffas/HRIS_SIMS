package sys.hris.sims.attendance.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// [BARU] Response GET /api/absensi/today-absence -- versi RINGKAS dari AttendanceTodayResponse
// untuk Dashboard semua role: hanya karyawan yang sakit dan yang izin (terlambat) hari ini.
// Sengaja hanya memuat nama & tanggal sakit -- tanpa employeeId, divisi, status persetujuan,
// surat dokter, maupun alasan -- karena dilihat rekan kerja, bukan HRD.
public record AttendanceTodayPublicResponse(
        LocalDate date,
        LocalDateTime generatedAt,
        List<Person> sick,
        List<Person> permission) {

    // sickStart / sickEnd hanya terisi untuk daftar sick.
    public record Person(String employeeName, LocalDate sickStart, LocalDate sickEnd) {
    }
}
