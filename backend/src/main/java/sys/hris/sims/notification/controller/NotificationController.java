package sys.hris.sims.notification.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.notification.dto.NotificationPageResponse;
import sys.hris.sims.notification.service.NotificationService;

// Tidak dicatat ke activity log: endpoint list di-poll otomatis tiap 30 detik.
// Aturan akses cukup `authenticated()` (anyRequest di SecurityConfig); service selalu
// membatasi data ke user yang sedang login.
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<NotificationPageResponse> list(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(notificationService.list(authentication.getName(), page, size));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markRead(@PathVariable Long id, Authentication authentication) {
        notificationService.markRead(authentication.getName(), id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllRead(Authentication authentication) {
        return ResponseEntity.ok(Map.of("updated", notificationService.markAllRead(authentication.getName())));
    }

    // Didaftarkan SEBELUM "/{id}" supaya "read" tidak dibaca sebagai id.
    @DeleteMapping("/read")
    public ResponseEntity<Map<String, Object>> deleteAllRead(Authentication authentication) {
        return ResponseEntity.ok(Map.of("deleted", notificationService.deleteAllRead(authentication.getName())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteRead(@PathVariable Long id, Authentication authentication) {
        notificationService.deleteRead(authentication.getName(), id);
        return ResponseEntity.ok(Map.of("deleted", 1));
    }
}
