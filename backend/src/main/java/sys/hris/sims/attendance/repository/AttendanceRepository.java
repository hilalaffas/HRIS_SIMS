package sys.hris.sims.attendance.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    // [BARU] Catatan Masuk hari ini -- dipakai AttendanceService.submit() untuk
    // menghitung durasi kerja saat check-out (aturan "pulang cepat").
    Optional<Attendance> findFirstByEmployee_EmployeeIdAndAttendanceDateAndAction(
            Long employeeId, LocalDate attendanceDate, String action);

    // [BARU] Dipakai HR/Super Admin (nanti, saat modul ini dihubungkan ke
    // Direktori Karyawan) untuk melihat absensi semua karyawan.
    List<Attendance> findAllByOrderByRecordedAtDesc();

    // [BARU] Semua pengajuan Sakit (check-in dengan reason SAKIT), terbaru
    // duluan -- dipakai halaman Persetujuan Sakit & Lembur (SuperAdmin).
    List<Attendance> findByReasonAndActionOrderByRecordedAtDesc(String reason, String action);

    // [BARU] Semua pengajuan Sakit milik satu karyawan -- dipakai untuk mengecek
    // apakah hari tertentu masih tercakup izin sakit multi-hari.
    List<Attendance> findByEmployee_EmployeeIdAndReasonAndActionOrderByRecordedAtDesc(
            Long employeeId, String reason, String action);

    // [BARU] Alat dev (panel /devAccess): data Izin/Sakit satu karyawan berdasarkan
    // username login, terbaru dulu.
    List<Attendance> findByEmployee_User_UsernameIgnoreCaseAndReasonInOrderByRecordedAtDesc(
            String username, List<String> reasons);

    // [BARU] Versi "aktif" dari pengecekan di atas: MENGABAIKAN pengajuan Sakit yang
    // DITOLAK (approval_status = REJECTED) supaya karyawan bisa Absen Masuk / mengajukan
    // Izin lagi di hari yang sama. Dipakai AttendanceService & OvertimeService.
    @Query("""
            select count(a) > 0 from Attendance a
            where a.employee.employeeId = :employeeId
              and a.attendanceDate = :attendanceDate
              and a.action = :action
              and a.approvalStatus <> 'REJECTED'
            """)
    boolean existsActiveByAction(@Param("employeeId") Long employeeId,
                                 @Param("attendanceDate") LocalDate attendanceDate,
                                 @Param("action") String action);

    @Query("""
            select count(a) > 0 from Attendance a
            where a.employee.employeeId = :employeeId
              and a.attendanceDate = :attendanceDate
              and a.action = :action
              and a.reason in :reasons
              and a.approvalStatus <> 'REJECTED'
            """)
    boolean existsActiveByActionAndReasonIn(@Param("employeeId") Long employeeId,
                                            @Param("attendanceDate") LocalDate attendanceDate,
                                            @Param("action") String action,
                                            @Param("reasons") List<String> reasons);

    // Catatan Masuk aktif hari ini (paling banyak satu, dijamin UNIQUE parsial V47).
    @Query("""
            select a from Attendance a
            where a.employee.employeeId = :employeeId
              and a.attendanceDate = :attendanceDate
              and a.action = :action
              and a.approvalStatus <> 'REJECTED'
            """)
    Optional<Attendance> findActiveByAction(@Param("employeeId") Long employeeId,
                                            @Param("attendanceDate") LocalDate attendanceDate,
                                            @Param("action") String action);

    // [BARU] Laporan Absensi (HRD): catatan absensi banyak karyawan sekaligus pada
    // rentang tanggal, dalam SATU query (join fetch employee + divisi) supaya tidak
    // terjadi N+1 saat dipetakan ke AttendanceResponse.
    @Query("""
            select a from Attendance a
            join fetch a.employee e
            left join fetch e.divisi
            where e.employeeId in :employeeIds
              and a.attendanceDate between :startDate and :endDate
            order by a.recordedAt asc
            """)
    List<Attendance> findForReport(@Param("employeeIds") List<Long> employeeIds,
                                   @Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate);
}
