package sys.hris.sims.devtools.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.attendance.dto.AttendanceResponse;
import sys.hris.sims.attendance.service.AttendanceService;
import sys.hris.sims.devtools.service.DevAccessService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] Alat bantu untuk akun dev (panel /devAccess): mereset data Izin/Sakit
// supaya alur pengajuan & persetujuan bisa diuji ulang. Dua lapis penjagaan:
//  1. SecurityConfig: /api/dev/** hanya role SUPER_ADMIN.
//  2. Di sini: harus akun dev (DevAccessService). Penolakan lewat ResponseEntity
//     403, BUKAN exception, karena GlobalExceptionHandler menangkap semua
//     Exception sebagai 400 (pola sama dengan FeatureFlagController).
// Setiap aksi dicatat ke activity log.
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevToolsController {

    private static final String FORBIDDEN_MESSAGE = "Hanya akun dev yang boleh memakai alat ini.";

    private final DevAccessService devAccessService;
    private final AttendanceService attendanceService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    private boolean isDevAccount(Authentication authentication) {
        return devAccessService.isDevAccount(authentication.getName());
    }

    // GET data Izin/Sakit milik satu karyawan (berdasarkan username login), terbaru dulu.
    @GetMapping("/attendance/permissions")
    public ResponseEntity<?> getPermissionRecords(@RequestParam String username, Authentication authentication) {
        if (!isDevAccount(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(FORBIDDEN_MESSAGE);
        }
        List<AttendanceResponse> records = attendanceService.getPermissionRecordsForDev(username);
        return ResponseEntity.ok(records);
    }

    // POST kembalikan status persetujuan Sakit ke PENDING (uji ulang approve/tolak).
    @PostMapping("/attendance/{attendanceId}/reset-approval")
    public ResponseEntity<?> resetApproval(@PathVariable Long attendanceId,
                                           Authentication authentication,
                                           HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(FORBIDDEN_MESSAGE);
        }
        AttendanceResponse response = attendanceService.resetSickApprovalForDev(attendanceId);

        activityLogService.log(
                authentication.getName(),
                getCurrentUserId(authentication),
                "DEV_RESET_APPROVAL_SAKIT",
                "attendances",
                response.getAttendanceId(),
                "Dev: status persetujuan sakit " + response.getEmployeeName() + " dikembalikan ke menunggu",
                httpRequest);

        return ResponseEntity.ok(response);
    }

    // DELETE satu data Izin/Sakit supaya tombol "Ajukan Izin / Sakit" bisa dites ulang.
    @DeleteMapping("/attendance/{attendanceId}")
    public ResponseEntity<?> deletePermissionRecord(@PathVariable Long attendanceId,
                                                    Authentication authentication,
                                                    HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(FORBIDDEN_MESSAGE);
        }
        AttendanceResponse deleted = attendanceService.deletePermissionRecordForDev(attendanceId);

        activityLogService.log(
                authentication.getName(),
                getCurrentUserId(authentication),
                "DEV_RESET_IZIN_SAKIT",
                "attendances",
                deleted.getAttendanceId(),
                "Dev: data " + deleted.getReason() + " " + deleted.getEmployeeName()
                        + " tanggal " + deleted.getAttendanceDate() + " dihapus",
                httpRequest);

        return ResponseEntity.ok(deleted);
    }
}
