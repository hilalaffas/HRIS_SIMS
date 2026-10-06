package sys.hris.sims.featureflag.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.featureflag.dto.FeatureFlagUpdateRequest;
import sys.hris.sims.featureflag.service.FeatureFlagService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] GET: semua user login (frontend membacanya setelah login).
// PUT: hanya akun 'supersecret' (lapis 1 di SecurityConfig = role SUPER_ADMIN,
// lapis 2 di method ini = username). Penolakan dikembalikan lewat
// ResponseEntity 403, BUKAN exception, karena GlobalExceptionHandler
// menangkap semua Exception sebagai 400.
@RestController
@RequestMapping("/api/feature-flags")
public class FeatureFlagController {

    private final FeatureFlagService featureFlagService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    public FeatureFlagController(FeatureFlagService featureFlagService,
                                 ActivityLogService activityLogService,
                                 UserRepository userRepository) {
        this.featureFlagService = featureFlagService;
        this.activityLogService = activityLogService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, Boolean>> getAll() {
        return ResponseEntity.ok(featureFlagService.getAll());
    }

    @PutMapping("/{key}")
    public ResponseEntity<?> update(@PathVariable String key,
                                    @RequestBody FeatureFlagUpdateRequest request,
                                    Authentication authentication,
                                    HttpServletRequest httpRequest) {
        if (!FeatureFlagService.SUPERSECRET_USERNAME.equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Hanya akun pengaturan khusus yang boleh mengubah fitur.");
        }
        if (request.enabled() == null) {
            return ResponseEntity.badRequest().body("Field 'enabled' wajib diisi (true/false).");
        }

        Map<String, Boolean> flags =
                featureFlagService.setEnabled(key, request.enabled(), authentication.getName());

        User user = userRepository.findByUsername(authentication.getName());
        activityLogService.log(
                authentication.getName(),
                user != null ? user.getUserId() : null,
                "UPDATE_FEATURE_FLAG",
                "feature_flags",
                null,
                "Mengubah fitur " + key + " menjadi " + (request.enabled() ? "AKTIF" : "NONAKTIF"),
                httpRequest);

        return ResponseEntity.ok(flags);
    }
}
