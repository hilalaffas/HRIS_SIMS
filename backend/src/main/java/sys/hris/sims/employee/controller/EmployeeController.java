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

import sys.hris.sims.employee.dto.UpdateEmployeeRequest;
import sys.hris.sims.employee.repository.EmergencyContactRelationshipRepository;
import java.nio.file.*;
import java.util.UUID;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/karyawan")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService karyawanService;    
    private final ActivityLogService activityLogService;

    private final UserRepository userRepository;

    private final EmergencyContactRelationshipRepository relationshipRepository;

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
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateKaryawan(
            @PathVariable Long id,
            @ModelAttribute UpdateEmployeeRequest request, // Gunakan @ModelAttribute
            Authentication authentication, 
            HttpServletRequest httpRequest) {

        // 1. Ambil data karyawan lama
        Employee employee = karyawanService.getKaryawanById(id);

        // 2. Update field data biasa
        employee.setFullName(request.getFullName());
        employee.setAddress(request.getAddress());
        employee.setPhoneNumber(request.getPhoneNumber());
        employee.setGender(request.getGender());
        employee.setNikKaryawan(request.getNikKaryawan());
        employee.setEmergencyContactName(request.getEmergencyContactName());
        employee.setEmergencyContactPhone(request.getEmergencyContactPhone());

        // Update relasi kontak darurat jika ada
        if (request.getEmergencyContactRelationshipId() != null) {
            var rel = relationshipRepository.findById(request.getEmergencyContactRelationshipId()).orElse(null);
            employee.setEmergencyContactRelationship(rel);
        }

        // 3. LOGIKA UPLOAD FOTO BARU
        if (request.getPhoto() != null && !request.getPhoto().isEmpty()) {
            try {
                // Hapus file lama jika ada (agar tidak menumpuk)
                if (employee.getPhoto() != null) {
                    Files.deleteIfExists(Paths.get(employee.getPhoto()));
                }

                String uploadDir = "uploads/photos/";
                Path uploadPath = Paths.get(uploadDir);
                if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);

                String fileName = UUID.randomUUID().toString() + "_" + request.getPhoto().getOriginalFilename();
                Path filePath = uploadPath.resolve(fileName);
                Files.copy(request.getPhoto().getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                
                employee.setPhoto(filePath.toString());
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("Gagal mengupdate foto: " + e.getMessage());
            }
        }

        // 4. Simpan perubahan
        Employee updated = karyawanService.updateKaryawan(id, employee);
        
        // Catat Log
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
