package sys.hris.sims.schedule.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.schedule.dto.ScheduleEntryResponse;
import sys.hris.sims.schedule.dto.SchedulePublishRequest;
import sys.hris.sims.schedule.dto.SchedulePublishResult;
import sys.hris.sims.schedule.service.WorkScheduleService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] Builder jadwal absensi bulanan. Keduanya ADMIN_ROLES (lihat SecurityConfig).
@RestController
@RequestMapping("/api/jadwal")
public class WorkScheduleController {

    private final WorkScheduleService scheduleService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    public WorkScheduleController(WorkScheduleService scheduleService,
                                  ActivityLogService activityLogService,
                                  UserRepository userRepository) {
        this.scheduleService = scheduleService;
        this.activityLogService = activityLogService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<ScheduleEntryResponse>> getByMonth(@RequestParam int year,
                                                                  @RequestParam int month) {
        return ResponseEntity.ok(scheduleService.getByMonth(year, month));
    }

    @PostMapping("/publish")
    public ResponseEntity<SchedulePublishResult> publish(@RequestBody SchedulePublishRequest request,
                                                         Authentication authentication,
                                                         HttpServletRequest httpRequest) {
        SchedulePublishResult result = scheduleService.publish(request, authentication.getName());

        User user = userRepository.findByUsername(authentication.getName());
        activityLogService.log(
                authentication.getName(),
                user != null ? user.getUserId() : null,
                "PUBLISH_JADWAL",
                "work_schedules",
                null,
                "Publish jadwal kerja: " + result.created() + " baru, " + result.updated() + " diperbarui",
                httpRequest);

        return ResponseEntity.ok(result);
    }
}
