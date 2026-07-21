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
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.repository.DivisiRepository;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
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

    private final DivisiRepository divisiRepository;

    // helper method ambil userId dari token
    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    // GET semua karyawan
    @GetMapping
    public ResponseEntity<List<Employee>> getAllKaryawan(Authentication authentication, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(karyawanService.getAllKaryawan());
    }

    // GET daftar approver aktif berdasarkan role: LEADER, SPV, MANAGER
    @GetMapping("/approvers")
    public ResponseEntity<List<Map<String, Object>>> getApproversByRole(
            @RequestParam String role,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        List<Map<String, Object>> response = karyawanService.getApproversByRole(role).stream()
                .map(employee -> Map.<String, Object>of(
                        "employeeId", employee.getEmployeeId(),
                        "fullName", employee.getFullName(),
                        "roleName", employee.getUser().getRoleId().getRoleName()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    // GET profil karyawan milik user yang sedang login (dipakai halaman Profile).
    // Ditaruh sebelum /{id} supaya jelas ini endpoint khusus, meski Spring MVC
    // tetap akan mencocokkan /me secara literal lebih spesifik daripada /{id}.
    @GetMapping("/me")
    public ResponseEntity<Employee> getMyProfile(Authentication authentication, HttpServletRequest httpRequest) {

        Employee me = karyawanService.getMyProfile(authentication.getName());

        activityLogService.log(authentication.getName(), getCurrentUserId(authentication),
                "GET_MY_PROFILE", "employees", me.getEmployeeId(), "Melihat profil sendiri", httpRequest);

        return ResponseEntity.ok(me);
    }
    // GET karyawan by ID
    @GetMapping("/{id}")
    public ResponseEntity<Employee> getKaryawanById(@PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(karyawanService.getKaryawanById(id));
    }

    // PUT update profil milik user yang sedang login (dipakai halaman Profile).
    // Beda dari PUT /{id} (khusus admin): endpoint ini SENGAJA tidak memproses
    // field yang terkunci untuk semua role (nikKaryawan, divisiId, gender,
    // tanggal bergabung) walau field itu ada di UpdateEmployeeRequest — supaya
    // user tidak bisa mengubahnya lewat endpoint profil sendiri, kirim manual
    // sekalipun (mis. lewat Postman). Perubahan data itu tetap harus lewat
    // modul HR/Karyawan yang memakai endpoint admin.
    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateMyProfile(
            @ModelAttribute UpdateEmployeeRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        Employee employee = karyawanService.getMyProfile(authentication.getName());

        if (isNotBlank(request.getFullName())) employee.setFullName(request.getFullName());
        if (isNotBlank(request.getAddress())) employee.setAddress(request.getAddress());
        if (isNotBlank(request.getPhoneNumber())) employee.setPhoneNumber(request.getPhoneNumber());
        if (isNotBlank(request.getEmergencyContactName())) employee.setEmergencyContactName(request.getEmergencyContactName());
        if (isNotBlank(request.getEmergencyContactPhone())) employee.setEmergencyContactPhone(request.getEmergencyContactPhone());

        if (request.getEmergencyContactRelationshipId() != null) {
            var rel = relationshipRepository.findById(request.getEmergencyContactRelationshipId()).orElse(null);
            employee.setEmergencyContactRelationship(rel);
        }

        if (request.getPhoto() != null && !request.getPhoto().isEmpty()) {
            try {
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

        Employee updated = karyawanService.save(employee);

        activityLogService.log(authentication.getName(), getCurrentUserId(authentication),
                "UPDATE_MY_PROFILE", "employees", employee.getEmployeeId(), "Mengupdate profil sendiri", httpRequest);

        return ResponseEntity.ok(updated);
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

        // 2. Update field data biasa -- HANYA timpa field yang benar-benar
        // dikirim dari form. Sebelumnya semua field ditimpa tanpa syarat,
        // jadi kalau form pengirim tidak punya input untuk field tertentu
        // (mis. ModalDetailKaryawan tidak punya input gender / nama kontak
        // darurat), field itu ikut kehapus jadi kosong setiap kali disimpan.
        if (isNotBlank(request.getFullName())) employee.setFullName(request.getFullName());
        if (isNotBlank(request.getAddress())) employee.setAddress(request.getAddress());
        if (isNotBlank(request.getPhoneNumber())) employee.setPhoneNumber(request.getPhoneNumber());
        if (isNotBlank(request.getGender())) employee.setGender(request.getGender());
        if (isNotBlank(request.getNikKaryawan())) employee.setNikKaryawan(request.getNikKaryawan());
        if (isNotBlank(request.getEmergencyContactName())) employee.setEmergencyContactName(request.getEmergencyContactName());
        if (isNotBlank(request.getEmergencyContactPhone())) employee.setEmergencyContactPhone(request.getEmergencyContactPhone());

        // [BARU] Jabatan (position) -- kolom baru, lihat migration V20
        if (isNotBlank(request.getPosition())) employee.setPosition(request.getPosition());

        // [BARU] Status akun (Aktif / Nonaktif). Dicek != null (bukan isNotBlank)
        // karena ini Boolean, bukan String.
        if (request.getIsActive() != null) employee.setIsActive(request.getIsActive());

        // [BARU] Tanggal gabung. Dikirim frontend sebagai String "yyyy-MM-dd"
        // (bawaan <input type="date">), jadi perlu di-parse manual ke LocalDate.
        if (isNotBlank(request.getJoinDate())) {
            try {
                employee.setJoinDate(LocalDate.parse(request.getJoinDate()));
            } catch (DateTimeParseException e) {
                return ResponseEntity.status(400).body("Format tanggal gabung tidak valid, gunakan yyyy-MM-dd");
            }
        }

        // Update divisi jika dikirim (divisiId wajib valid kalau dikirim)
        if (request.getDivisiId() != null) {
            Divisi divisi = divisiRepository.findById(request.getDivisiId()).orElse(null);
            if (divisi == null) {
                return ResponseEntity.status(400).body("Divisi tidak ditemukan");
            }
            employee.setDivisi(divisi);
        }

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
        activityLogService.log(
            authentication.getName(), 
            getCurrentUserId(authentication), 
            "UPDATE_KARYAWAN", 
            "employees", 
            id, 
            "Mengupdate karyawan id: " + id + " (Status aktif: " + updated.getIsActive() + ")", 
            httpRequest
        );
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

    private boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }
}