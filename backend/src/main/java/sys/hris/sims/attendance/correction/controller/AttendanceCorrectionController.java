package sys.hris.sims.attendance.correction.controller;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.correction.dto.*;
import sys.hris.sims.attendance.correction.service.AttendanceCorrectionService;

@RestController
@RequestMapping("/api/absensi/corrections")
@RequiredArgsConstructor
public class AttendanceCorrectionController {
    private final AttendanceCorrectionService service;

    @PostMapping("/me")
    public ResponseEntity<AttendanceCorrectionResponse> submit(
            @RequestBody AttendanceCorrectionRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.submit(authentication.getName(), request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<AttendanceCorrectionResponse>> mine(Authentication authentication) {
        return ResponseEntity.ok(service.getMine(authentication.getName()));
    }

    @GetMapping("/approvals")
    public ResponseEntity<List<AttendanceCorrectionResponse>> approvals(Authentication authentication) {
        return ResponseEntity.ok(service.getApprovals(authentication));
    }

    @PutMapping("/{id}/approval")
    public ResponseEntity<AttendanceCorrectionResponse> decide(
            @PathVariable Long id, @RequestBody sys.hris.sims.common.dto.ApprovalDecisionRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(service.decide(id, request.getStatus(), request.getNote(), authentication));
    }
}
