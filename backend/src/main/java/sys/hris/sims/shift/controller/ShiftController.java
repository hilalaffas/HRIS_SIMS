package sys.hris.sims.shift.controller;

import java.util.List;

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
import sys.hris.sims.shift.dto.ShiftResponse;
import sys.hris.sims.shift.dto.ShiftUpdateRequest;
import sys.hris.sims.shift.entity.Shift;
import sys.hris.sims.shift.service.ShiftService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] GET: semua user login. PUT: ADMIN_ROLES (lihat SecurityConfig).
@RestController
@RequestMapping("/api/shift")
public class ShiftController {

    private final ShiftService shiftService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    public ShiftController(ShiftService shiftService,
                           ActivityLogService activityLogService,
                           UserRepository userRepository) {
        this.shiftService = shiftService;
        this.activityLogService = activityLogService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<ShiftResponse>> getAll() {
        return ResponseEntity.ok(shiftService.getAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShiftResponse> updateHours(@PathVariable Long id,
                                                     @RequestBody ShiftUpdateRequest request,
                                                     Authentication authentication,
                                                     HttpServletRequest httpRequest) {
        Shift updated = shiftService.updateHours(id, request);

        User user = userRepository.findByUsername(authentication.getName());
        activityLogService.log(
                authentication.getName(),
                user != null ? user.getUserId() : null,
                "UPDATE_SHIFT",
                "shifts",
                id,
                "Mengubah jam " + updated.getName() + " menjadi "
                        + updated.getStartTime() + " - " + updated.getEndTime(),
                httpRequest);

        return ResponseEntity.ok(ShiftResponse.from(updated));
    }
}
