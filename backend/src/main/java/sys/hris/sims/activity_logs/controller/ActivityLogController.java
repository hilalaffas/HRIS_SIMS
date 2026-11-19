package sys.hris.sims.activity_logs.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import sys.hris.sims.activity_logs.service.ActivityLogService;

@RestController
@RequestMapping("/api/admin/logs")
@RequiredArgsConstructor
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @GetMapping
    public ResponseEntity<?> getAllLogs(Authentication authentication) {
        return ResponseEntity.ok(activityLogService.getAllLogs(authentication.getName()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getLogsByUser(@PathVariable Long userId, Authentication authentication) {
        return ResponseEntity.ok(activityLogService.getLogsByUser(userId, authentication.getName()));
    }
}