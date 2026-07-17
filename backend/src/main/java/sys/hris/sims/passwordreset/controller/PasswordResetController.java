package sys.hris.sims.passwordreset.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.passwordreset.dto.ApprovePasswordResetRequest;
import sys.hris.sims.passwordreset.dto.ForgotPasswordRequest;
import sys.hris.sims.passwordreset.dto.PasswordResetResponse;
import sys.hris.sims.passwordreset.dto.PendingPasswordResetResponse;
import sys.hris.sims.passwordreset.service.PasswordResetService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

@RestController
@RequestMapping("/api/password-reset")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    // Helper untuk konsistensi data log
    private Long getCurrentUserId(Authentication authentication) {
        if (authentication == null) return null;
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    private String getUsername(Authentication authentication) {
        return authentication != null ? authentication.getName() : "System";
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<PasswordResetResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {

        PasswordResetResponse response = passwordResetService.createRequest(request);
        
        // Log aktivitas diperbaiki: getUsername() dan label "username"
        activityLogService.log("System", null, 
            "FORGOT_PASSWORD", "password_resets", null, 
            "Permintaan reset password untuk username: " + request.getUsername(), httpRequest);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','HRD_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<PendingPasswordResetResponse>> getPendingRequests(
            Authentication authentication, 
            HttpServletRequest httpRequest) {

        activityLogService.log(getUsername(authentication), getCurrentUserId(authentication), 
            "GET_PENDING_RESET", "password_resets", null, 
            "Melihat daftar permintaan reset password", httpRequest);

        return ResponseEntity.ok(passwordResetService.getPendingRequests());
    }

    @GetMapping("/count")
    @PreAuthorize("hasAnyRole('ADMIN','HRD_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Map<String, Long>> getPendingCount(
            Authentication authentication, 
            HttpServletRequest httpRequest) {

        activityLogService.log(getUsername(authentication), getCurrentUserId(authentication), 
            "GET_PENDING_COUNT", "password_resets", null, 
            "Melihat jumlah permintaan reset password", httpRequest);

        return ResponseEntity.ok(
                Map.of("count", passwordResetService.getPendingCount()));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','HRD_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<String> approveRequest(
            @PathVariable Long id,
            @RequestBody ApprovePasswordResetRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        String result = passwordResetService.approveRequest(id, request, authentication);
        
        activityLogService.log(getUsername(authentication), getCurrentUserId(authentication), 
            "APPROVE_PASSWORD_RESET", "password_resets", id, 
            "Menyetujui permintaan reset password id: " + id, httpRequest);

        return ResponseEntity.ok(result);
    }
}