package sys.hris.sims.holiday.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.holiday.dto.HolidayRequest;
import sys.hris.sims.holiday.dto.HolidaySyncResult;
import sys.hris.sims.holiday.service.HolidayService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/holidays")
@RequiredArgsConstructor
public class HolidayController {

    private final HolidayService holidayService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    private Long getCurrentUserId(Authentication authentication) {
        if (authentication == null) return null;
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    private String getUsername(Authentication authentication) {
        return authentication != null ? authentication.getName() : "System";
    }

    @GetMapping
    public ResponseEntity<?> getAllHolidays() {
        return ResponseEntity.ok(holidayService.getAllHolidays());
    }

    @GetMapping("/month")
    public ResponseEntity<?> getByMonth(@RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(holidayService.getHolidaysByMonth(year, month));
    }

    @GetMapping("/range")
    public ResponseEntity<?> getByRange(@RequestParam LocalDate start, @RequestParam LocalDate end) {
        return ResponseEntity.ok(holidayService.getHolidaysByRange(start, end));
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkHoliday(@RequestParam LocalDate date) {
        return ResponseEntity.ok(holidayService.isHoliday(date));
    }

    @PostMapping
    public ResponseEntity<?> createHoliday(@RequestBody HolidayRequest request, Authentication authentication, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(authentication);
        var saved = holidayService.createHoliday(request, userId);
        activityLogService.log(getUsername(authentication), userId, "CREATE_HOLIDAY", "holidays", saved.getHolidayId(),
                "Menambah hari libur: " + saved.getName(), httpRequest);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateHoliday(@PathVariable Long id, @RequestBody HolidayRequest request, Authentication authentication, HttpServletRequest httpRequest) {
        var updated = holidayService.updateHoliday(id, request);
        activityLogService.log(getUsername(authentication), getCurrentUserId(authentication), "UPDATE_HOLIDAY", "holidays", id,
                "Mengupdate hari libur: " + updated.getName(), httpRequest);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteHoliday(@PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        holidayService.deleteHoliday(id);
        activityLogService.log(getUsername(authentication), getCurrentUserId(authentication), "DELETE_HOLIDAY", "holidays", id,
                "Menghapus hari libur dengan ID: " + id, httpRequest);
        return ResponseEntity.ok("Hari libur berhasil dihapus");
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncHolidays(@RequestParam int year, Authentication authentication, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(authentication);
        HolidaySyncResult result = holidayService.syncNationalHolidays(year, userId);
        activityLogService.log(getUsername(authentication), userId, "SYNC_HOLIDAY", "holidays", null,
                "Sync libur nasional tahun " + year + " (insert: " + result.getInserted() + ", update: " + result.getUpdated() + ", skip: " + result.getSkipped() + ")",
                httpRequest);
        return ResponseEntity.ok(result);
    }
}