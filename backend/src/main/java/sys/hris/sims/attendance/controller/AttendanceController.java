package sys.hris.sims.attendance.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.attendance.dto.AttendanceReportResponse;
import sys.hris.sims.attendance.dto.AttendanceResponse;
import sys.hris.sims.attendance.dto.AttendanceSubmitRequest;
import sys.hris.sims.attendance.dto.LeaveTodayResponse;
import sys.hris.sims.attendance.dto.LocationNameResponse;
import sys.hris.sims.attendance.dto.PermissionSubmitRequest;
import sys.hris.sims.attendance.service.AttendanceReportService;
import sys.hris.sims.attendance.service.AttendanceService;
import sys.hris.sims.attendance.service.ReverseGeocodingService;
import sys.hris.sims.common.dto.ApprovalDecisionRequest;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] Endpoint modul Absensi. Pola & gaya penulisan disamakan dengan
// LeaveController (leave/controller/LeaveController.java): helper
// getCurrentUserId untuk activity log, endpoint "/me" untuk data milik
// user yang login, endpoint tanpa "/me" untuk HR/Super Admin (dibatasi
// role di SecurityConfig).
@RestController
@RequestMapping("/api/absensi")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;
    // [BARU] Laporan Absensi (HRD)
    private final AttendanceReportService attendanceReportService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;
    // [BARU] Nama lokasi dari koordinat (popup absen Dashboard).
    private final ReverseGeocodingService reverseGeocodingService;

    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    // GET riwayat absensi milik user yang sedang login
    @GetMapping("/me")
    public ResponseEntity<List<AttendanceResponse>> getMyHistory(Authentication authentication) {
        return ResponseEntity.ok(attendanceService.getMyHistory(authentication.getName()));
    }

    // [BARU] Status cuti hari ini (NONE | FULL_DAY | HALF_MORNING | HALF_AFTERNOON)
    // supaya tombol Absen Masuk/Keluar tahu kapan harus terkunci.
    @GetMapping("/me/leave-today")
    public ResponseEntity<LeaveTodayResponse> getMyLeaveToday(Authentication authentication) {
        return ResponseEntity.ok(attendanceService.getMyLeaveToday(authentication.getName()));
    }

    // POST catat absensi (Masuk/Keluar) -- multipart/form-data: action,
    // reason, note, latitude, longitude, photo.
    @PostMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttendanceResponse> submitAttendance(
            @ModelAttribute AttendanceSubmitRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AttendanceResponse response = attendanceService.submit(authentication.getName(), request);

        activityLogService.log(
                authentication.getName(),
                getCurrentUserId(authentication),
                "SUBMIT_ABSENSI",
                "attendances",
                response.getAttendanceId(),
                "Absensi " + response.getAction() + " tercatat",
                httpRequest);

        return ResponseEntity.ok(response);
    }

    // [BARU] POST pengajuan Izin / Sakit (popup "Ajukan Izin / Sakit") -- multipart:
    // type (SAKIT | TERLAMBAT), note, days, document (opsional, surat dokter).
    @PostMapping(value = "/me/izin", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttendanceResponse> submitPermission(
            @ModelAttribute PermissionSubmitRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AttendanceResponse response = attendanceService.submitPermission(authentication.getName(), request);

        activityLogService.log(
                authentication.getName(),
                getCurrentUserId(authentication),
                "SUBMIT_IZIN",
                "attendances",
                response.getAttendanceId(),
                "Pengajuan " + ("SAKIT".equals(response.getReason()) ? "izin sakit" : "izin terlambat") + " tercatat",
                httpRequest);

        return ResponseEntity.ok(response);
    }

    // [BARU] POST surat dokter SUSULAN untuk pengajuan Sakit milik sendiri -- multipart: document.
    @PostMapping(value = "/{attendanceId}/document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttendanceResponse> uploadMedicalDocument(
            @PathVariable Long attendanceId,
            @RequestPart("document") MultipartFile document,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AttendanceResponse response = attendanceService.uploadMedicalDocument(attendanceId, document, authentication.getName());

        activityLogService.log(
                authentication.getName(),
                getCurrentUserId(authentication),
                "UPLOAD_SURAT_DOKTER",
                "attendances",
                response.getAttendanceId(),
                "Surat dokter susulan diunggah",
                httpRequest);

        return ResponseEntity.ok(response);
    }

    // [BARU] GET nama lokasi dari koordinat -- dipakai popup absen di Dashboard
    // untuk menampilkan "Titik Lokasi Anda". Hanya user login, dibatasi 15
    // permintaan/menit per user karena memanggil API Google berbayar.
    // `locationName` null = tidak tersedia (bukan error).
    @GetMapping("/location-name")
    public ResponseEntity<?> getLocationName(
            @RequestParam double lat,
            @RequestParam double lng,
            Authentication authentication) {
        if (Double.isNaN(lat) || Double.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new IllegalArgumentException("Koordinat lokasi tidak valid.");
        }
        if (!reverseGeocodingService.tryAcquire(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Terlalu banyak permintaan lokasi. Coba lagi sebentar lagi.");
        }
        String name = reverseGeocodingService.resolveName(lat, lng).orElse(null);
        return ResponseEntity.ok(new LocationNameResponse(name));
    }

    // [BARU] GET semua riwayat absensi (HR/Super Admin) -- dibatasi
    // ADMIN_ROLES di SecurityConfig. Disiapkan untuk pengembangan lanjutan
    // (dihubungkan ke Direktori Karyawan / rekap bersama data Cuti), belum
    // dipakai halaman frontend mana pun saat ini.
    // [UBAH] GET daftar pengajuan Sakit untuk tab "Izin Sakit" di Persetujuan Cuti --
    // Leader, SPV, Manager (dibatasi di SecurityConfig; cakupan datanya di AttendanceService).
    @GetMapping("/approvals/sakit")
    public ResponseEntity<List<AttendanceResponse>> getSickApprovals(Authentication authentication) {
        return ResponseEntity.ok(attendanceService.getSickApprovals(authentication));
    }

    // [BARU] PUT setujui/tolak pengajuan Sakit -- body: { "status": "APPROVED" | "REJECTED" }
    @PutMapping("/{attendanceId}/approval")
    public ResponseEntity<AttendanceResponse> decideSick(
            @PathVariable Long attendanceId,
            @RequestBody ApprovalDecisionRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AttendanceResponse response = attendanceService.decideSick(attendanceId, request.getStatus(), request.getNote(), authentication);

        activityLogService.log(
                authentication.getName(),
                getCurrentUserId(authentication),
                "APPROVED".equals(response.getApprovalStatus()) ? "APPROVE_SAKIT" : "REJECT_SAKIT",
                "attendances",
                response.getAttendanceId(),
                "Pengajuan sakit " + response.getEmployeeName() + " "
                        + ("APPROVED".equals(response.getApprovalStatus()) ? "disetujui" : "ditolak"),
                httpRequest);

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<AttendanceResponse>> getAllHistory(Authentication authentication, HttpServletRequest httpRequest) {
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_ALL_ABSENSI", "attendances", null, "Melihat semua data absensi", httpRequest);
        return ResponseEntity.ok(attendanceService.getAllHistory());
    }

    // [BARU] Laporan Absensi (HRD_ADMIN / SUPER_ADMIN -- dibatasi di SecurityConfig).
    // GET /api/absensi/laporan?from=2026-09-21&to=2026-10-20[&divisiId=3]
    // divisiId kosong = semua divisi.
    @GetMapping("/laporan")
    public ResponseEntity<AttendanceReportResponse> getReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long divisiId,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        AttendanceReportResponse report = attendanceReportService.buildReport(from, to, divisiId);
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication),
                "GET_LAPORAN_ABSENSI", "attendances", null,
                "Melihat laporan absensi " + from + " s/d " + to
                        + (divisiId == null ? " (semua divisi)" : " (divisi " + divisiId + ")"),
                httpRequest);
        return ResponseEntity.ok(report);
    }
}
