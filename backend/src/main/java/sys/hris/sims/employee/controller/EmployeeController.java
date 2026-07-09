package sys.hris.sims.employee.controller;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.service.EmployeeService;
import sys.hris.sims.user.repository.UserRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import org.springframework.security.core.Authentication;

import sys.hris.sims.user.entity.User;

@RestController
@RequestMapping("/api/karyawan")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService karyawanService;    
    private final ActivityLogService activityLogService;

    private final UserRepository userRepository;

    // helper method ambil userId dari token
    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    // GET semua karyawan
    @GetMapping
    public ResponseEntity<List<Employee>> getAllKaryawan(Authentication authentication, HttpServletRequest httpRequest) {

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_ALL_KARYAWAN", "employees", null, "Melihat semua data karyawan", httpRequest);

        return ResponseEntity.ok(karyawanService.getAllKaryawan());
    }

    // GET daftar approver aktif berdasarkan role: LEADER, SPV, MANAGER
    @GetMapping("/approvers")
    public ResponseEntity<List<Map<String, Object>>> getApproversByRole(
            @RequestParam String role,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_APPROVERS", "employees", null, "Melihat daftar approver role: " + role, httpRequest);

        List<Map<String, Object>> response = karyawanService.getApproversByRole(role).stream()
                .map(employee -> Map.<String, Object>of(
                        "employeeId", employee.getEmployeeId(),
                        "fullName", employee.getFullName(),
                        "roleName", employee.getUser().getRoleId().getRoleName()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    // GET karyawan by ID
    @GetMapping("/{id}")
    public ResponseEntity<Employee> getKaryawanById(@PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_KARYAWAN", "employees", id, "Melihat detail karyawan id: " + id, httpRequest);
        return ResponseEntity.ok(karyawanService.getKaryawanById(id));
    }

    // POST tambah karyawan
    @PostMapping
    public ResponseEntity<Employee> createKaryawan(@RequestBody Employee karyawan, Authentication authentication, HttpServletRequest httpRequest) {

        // catat activity log
        Employee saved = karyawanService.createKaryawan(karyawan);
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "CREATE_KARYAWAN", "employees", saved.getEmployeeId(),
            "Menambah karyawan: " + saved.getFullName(), httpRequest);

        return ResponseEntity.ok(saved);
    }

    // PUT update karyawan
    @PutMapping("/{id}")
    public ResponseEntity<Employee> updateKaryawan(
            @PathVariable Long id,
            @RequestBody Employee karyawan, Authentication authentication, HttpServletRequest httpRequest) {
        
        // catat activity log
        Employee updated = karyawanService.updateKaryawan(id, karyawan);
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "UPDATE_KARYAWAN", "employees", id, "Mengupdate karyawan id: " + id, httpRequest);
        
        return ResponseEntity.ok(updated);
    }

    // DELETE karyawan (soft delete)
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteKaryawan(@PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        karyawanService.deleteKaryawan(id);

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "DELETE_KARYAWAN", "employees", id, "Menonaktifkan karyawan id: " + id, httpRequest);

        return ResponseEntity.ok("Karyawan berhasil dinonaktifkan");
    }
}
