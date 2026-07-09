package sys.hris.sims.passwordreset.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import sys.hris.sims.passwordreset.dto.ApprovePasswordResetRequest;
import sys.hris.sims.passwordreset.dto.ForgotPasswordRequest;
import sys.hris.sims.passwordreset.dto.PasswordResetResponse;
import sys.hris.sims.passwordreset.entity.PasswordResetRequest;
import sys.hris.sims.passwordreset.service.PasswordResetService;

@RestController
@RequestMapping("/api/password-reset")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/forgot-password")
    public ResponseEntity<PasswordResetResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        return ResponseEntity.ok(passwordResetService.createRequest(request));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','HRD_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<List<PasswordResetRequest>> getPendingRequests() {

        return ResponseEntity.ok(passwordResetService.getPendingRequests());
    }

    @GetMapping("/count")
    @PreAuthorize("hasAnyRole('ADMIN','HRD_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Map<String, Long>> getPendingCount() {

        return ResponseEntity.ok(
                Map.of("count", passwordResetService.getPendingCount()));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','HRD_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<String> approveRequest(
            @PathVariable Long id,
            @RequestBody ApprovePasswordResetRequest request,
            Authentication authentication) {

        return ResponseEntity.ok(
                passwordResetService.approveRequest(id, request, authentication));
    }
}