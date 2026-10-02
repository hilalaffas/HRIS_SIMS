package sys.hris.sims.overtime.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.overtime.dto.OvertimeResponse;
import sys.hris.sims.overtime.dto.OvertimeSubmitRequest;
import sys.hris.sims.overtime.service.OvertimeService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] Endpoint Pengajuan Lembur milik user yang login ("/me"), pola sama
// dengan AttendanceController.
@RestController
@RequestMapping("/api/lembur")
@RequiredArgsConstructor
public class OvertimeController {

    private final OvertimeService overtimeService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    @GetMapping("/me")
    public ResponseEntity<List<OvertimeResponse>> getMyOvertime(Authentication authentication) {
        return ResponseEntity.ok(overtimeService.getMyOvertime(authentication.getName()));
    }

    @PostMapping("/me")
    public ResponseEntity<OvertimeResponse> submitOvertime(
            @RequestBody OvertimeSubmitRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        OvertimeResponse response = overtimeService.submit(authentication.getName(), request);

        activityLogService.log(
                authentication.getName(),
                getCurrentUserId(authentication),
                "SUBMIT_LEMBUR",
                "overtime_requests",
                response.getOvertimeId(),
                "Pengajuan lembur tanggal " + response.getOvertimeDate() + " dikirim",
                httpRequest);

        return ResponseEntity.ok(response);
    }
}
