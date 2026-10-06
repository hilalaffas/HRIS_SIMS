package sys.hris.sims.attendance.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import sys.hris.sims.attendance.entity.Attendance;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    // Riwayat absensi milik satu karyawan, terbaru duluan -- dipakai
    // GET /api/absensi/me (halaman Absensi karyawan).
    List<Attendance> findByEmployee_EmployeeIdOrderByRecordedAtDesc(Long employeeId);

    // [BARU] Dipakai AttendanceService.submit() untuk menegakkan aturan
    // "1x Masuk & 1x Keluar per karyawan per hari" di level aplikasi
    // (pesan error yang jelas), selain constraint UNIQUE di database
    // (jaring pengaman kedua kalau ada race condition).
    boolean existsByEmployee_EmployeeIdAndAttendanceDateAndAction(Long employeeId, LocalDate attendanceDate, String action);

    // [BARU] Dipakai untuk memblokir check-out di hari karyawan mengajukan Sakit/Izin.
    boolean existsByEmployee_EmployeeIdAndAttendanceDateAndActionAndReasonIn(
            Long employeeId, LocalDate attendanceDate, String action, List<String> reasons);

    // [BARU] Dipakai HR/Super Admin (nanti, saat modul ini dihubungkan ke
    // Direktori Karyawan) untuk melihat absensi semua karyawan.
    List<Attendance> findAllByOrderByRecordedAtDesc();

    // [BARU] Semua pengajuan Sakit (check-in dengan reason SAKIT), terbaru
    // duluan -- dipakai halaman Persetujuan Sakit & Lembur (SuperAdmin).
    List<Attendance> findByReasonAndActionOrderByRecordedAtDesc(String reason, String action);
}
