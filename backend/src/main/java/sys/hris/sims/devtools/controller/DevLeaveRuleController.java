package sys.hris.sims.devtools.controller;

import java.time.LocalDate;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.devtools.service.DevAccessService;
import sys.hris.sims.leave.service.LeaveRuleService;
import sys.hris.sims.leave.service.LeaveSummaryService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] Pengaturan TANGGAL BERLAKU CUTI HANGUS di panel /devAccess (akun dev saja).
//
//   GET  /api/dev/leave-rules/forfeit       -> { startDate, defaultStartDate, neverDate }
//   PUT  /api/dev/leave-rules/forfeit       -> { startDate } simpan tanggal baru
//   POST /api/dev/leave-rules/forfeit/reset -> kembali ke bawaan (2025-01-01)
//   GET  /api/dev/leave-rules/forfeit/scan  -> pindai tahun mana yang paling cocok dengan data + daftar karyawan tidak cocok
//
// Dua lapis penjagaan seperti DevDataController: SecurityConfig (/api/dev/** SUPER_ADMIN/DEV) lalu DevAccessService.
// Mengubah aturan TIDAK menulis ulang data lama: hanya memengaruhi perhitungan hangus berikutnya dan import berikutnya.
@RestController
@RequestMapping("/api/dev/leave-rules/forfeit")
@RequiredArgsConstructor
public class DevLeaveRuleController {

    private static final String FORBIDDEN_MESSAGE = "Hanya akun dev yang boleh memakai alat ini.";

    private final DevAccessService devAccessService;
    private final LeaveRuleService leaveRuleService;
    private final LeaveSummaryService leaveSummaryService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    public record RuleResponse(LocalDate startDate, LocalDate defaultStartDate, LocalDate neverDate) {
    }

    public record UpdateRuleRequest(LocalDate startDate) {
    }

    @GetMapping
    public ResponseEntity<?> get(Authentication authentication) {
        if (!devAccessService.isDevAccount(authentication.getName())) {
            return forbidden();
        }
        return ResponseEntity.ok(response(leaveRuleService.getForfeitStartDate()));
    }

    @PutMapping
    public ResponseEntity<?> update(@RequestBody UpdateRuleRequest request,
                                    Authentication authentication,
                                    HttpServletRequest httpRequest) {
        if (!devAccessService.isDevAccount(authentication.getName())) {
            return forbidden();
        }
        LocalDate before = leaveRuleService.getForfeitStartDate();
        LocalDate saved = leaveRuleService.setForfeitStartDate(request.startDate(), authentication.getName());
        log(authentication, httpRequest, "DEV_UBAH_ATURAN_HANGUS",
                "Dev: tanggal berlaku cuti hangus diubah dari " + before + " ke " + saved);
        return ResponseEntity.ok(response(saved));
    }

    @PostMapping("/reset")
    public ResponseEntity<?> reset(Authentication authentication, HttpServletRequest httpRequest) {
        if (!devAccessService.isDevAccount(authentication.getName())) {
            return forbidden();
        }
        LocalDate before = leaveRuleService.getForfeitStartDate();
        LocalDate saved = leaveRuleService.setForfeitStartDate(
                LeaveRuleService.DEFAULT_FORFEIT_START_DATE, authentication.getName());
        log(authentication, httpRequest, "DEV_UBAH_ATURAN_HANGUS",
                "Dev: tanggal berlaku cuti hangus dikembalikan ke bawaan (" + before + " -> " + saved + ")");
        return ResponseEntity.ok(response(saved));
    }

    @GetMapping("/scan")
    public ResponseEntity<?> scan(Authentication authentication, HttpServletRequest httpRequest) {
        if (!devAccessService.isDevAccount(authentication.getName())) {
            return forbidden();
        }
        log(authentication, httpRequest, "DEV_PINDAI_ATURAN_HANGUS", "Dev: memindai tahun berlaku cuti hangus yang paling cocok");
        return ResponseEntity.ok(leaveSummaryService.scanForfeitStartDates());
    }

    private static RuleResponse response(LocalDate startDate) {
        return new RuleResponse(startDate, LeaveRuleService.DEFAULT_FORFEIT_START_DATE, LeaveRuleService.NEVER);
    }

    private static ResponseEntity<String> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(FORBIDDEN_MESSAGE);
    }

    private void log(Authentication authentication, HttpServletRequest httpRequest, String action, String description) {
        User user = userRepository.findByUsername(authentication.getName());
        activityLogService.log(authentication.getName(), user != null ? user.getUserId() : null,
                action, "leave_rules", null, description, httpRequest);
    }
}
