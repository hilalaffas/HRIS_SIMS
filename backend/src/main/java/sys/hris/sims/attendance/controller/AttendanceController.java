package sys.hris.sims.attendance.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.attendance.dto.AttendanceResponse;
import sys.hris.sims.attendance.dto.AttendanceSubmitRequest;
import sys.hris.sims.attendance.service.AttendanceService;
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
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    // GET riwayat absensi milik user yang sedang login
    @GetMapping("/me")
    public ResponseEntity<List<AttendanceResponse>> getMyHistory(Authentication authentication) {
        return ResponseEntity.ok(attendanceService.getMyHistory(authentication.getName()));
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

    // [BARU] GET semua riwayat absensi (HR/Super Admin) -- dibatasi
    // ADMIN_ROLES di SecurityConfig. Disiapkan untuk pengembangan lanjutan
    // (dihubungkan ke Direktori Karyawan / rekap bersama data Cuti), belum
    // dipakai halaman frontend mana pun saat ini.
    @GetMapping
    public ResponseEntity<List<AttendanceResponse>> getAllHistory(Authentication authentication, HttpServletRequest httpRequest) {
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_ALL_ABSENSI", "attendances", null, "Melihat semua data absensi", httpRequest);
        return ResponseEntity.ok(attendanceService.getAllHistory());
    }
}
