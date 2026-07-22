package sys.hris.sims.employee.controller;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.repository.DivisiRepository;
import sys.hris.sims.employee.dto.UpdateEmployeeRequest;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmergencyContactRelationshipRepository;
import sys.hris.sims.employee.service.EmployeeService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

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
        
        // [MERGED] catat activity log dari file kedua
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_ALL_KARYAWAN", "employees", null, "Melihat semua data karyawan", httpRequest);

        return ResponseEntity.ok(karyawanService.getAllKaryawan());
    }

    // GET daftar approver aktif berdasarkan role: LEADER, SPV, MANAGER
    @GetMapping("/approvers")
    public ResponseEntity<List<Map<String, Object>>> getApproversByRole(
            @RequestParam String role,
            @RequestParam(required = false) Long employeeId, // [BARU]
            Authentication authentication,
            HttpServletRequest httpRequest) {

        // [MERGED] catat activity log dan logika filter divisi dari file kedua
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_APPROVERS", "employees", null, "Melihat daftar approver role: " + role, httpRequest);

        Employee requester = karyawanService.getKaryawanByUsername(authentication.getName());

        // [BARU] employeeId dipakai HR/Super Admin untuk mengambil approver
        // ATAS NAMA karyawan lain (dipakai form Cuti Susulan di halaman
        // Manajemen Karyawan) -- divisi acuan jadi divisi KARYAWAN TARGET,
        // bukan divisi HR yang sedang login. Kalau tidak diisi, perilaku
        // persis seperti sebelumnya (divisi dari user yang login sendiri).
        Employee divisionSource = requester;
        if (employeeId != null) {
            String requesterRoleName = requester.getUser().getRoleId().getRoleName();
            boolean isPrivileged = "HRD_ADMIN".equalsIgnoreCase(requesterRoleName)
                    || "SUPER_ADMIN".equalsIgnoreCase(requesterRoleName);
            if (!isPrivileged) {
                throw new RuntimeException("Tidak memiliki akses untuk memilih approver atas nama karyawan lain");
            }
            divisionSource = karyawanService.getKaryawanById(employeeId);
        }

        Long divisiId = divisionSource.getDivisi() == null ? null : divisionSource.getDivisi().getId();

        List<Map<String, Object>> response = karyawanService.getApproversByRoleAndDivisi(role, divisiId).stream()
                .map(employee -> Map.<String, Object>of(
                        "employeeId", employee.getEmployeeId(),
                        "fullName", employee.getFullName(),
                        "roleName", employee.getUser().getRoleId().getRoleName(),
                        "divisiId", employee.getDivisi().getId(),
                        "namaDivisi", employee.getDivisi().getNamaDivisi()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    // GET profil karyawan milik user yang sedang login (dipakai halaman Profile).
    // Mempertahankan method ini dari file pertama.
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
        
        // [MERGED] catat activity log dari file kedua
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_KARYAWAN", "employees", id, "Melihat detail karyawan id: " + id, httpRequest);
        
        return ResponseEntity.ok(karyawanService.getKaryawanById(id));
    }

    // PUT update profil milik user yang sedang login (dipakai halaman Profile).
    // Mempertahankan method ini dari file pertama.
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
    // Mempertahankan fungsi baru (Position, isActive, joinDate) dari file pertama
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateKaryawan(
            @PathVariable Long id,
            @ModelAttribute UpdateEmployeeRequest request, 
            Authentication authentication, 
            HttpServletRequest httpRequest) {

        // 1. Ambil data karyawan lama
        Employee employee = karyawanService.getKaryawanById(id);

        if (isNotBlank(request.getFullName())) employee.setFullName(request.getFullName());
        if (isNotBlank(request.getAddress())) employee.setAddress(request.getAddress());
        if (isNotBlank(request.getPhoneNumber())) employee.setPhoneNumber(request.getPhoneNumber());
        if (isNotBlank(request.getGender())) employee.setGender(request.getGender());
        if (isNotBlank(request.getNikKaryawan())) employee.setNikKaryawan(request.getNikKaryawan());
        if (isNotBlank(request.getEmergencyContactName())) employee.setEmergencyContactName(request.getEmergencyContactName());
        if (isNotBlank(request.getEmergencyContactPhone())) employee.setEmergencyContactPhone(request.getEmergencyContactPhone());

        // [BARU] Jabatan (position)
        if (isNotBlank(request.getPosition())) employee.setPosition(request.getPosition());

        // [BARU] Status akun
        if (request.getIsActive() != null) employee.setIsActive(request.getIsActive());

        // [PERBAIKAN BUG] Buka kunci login (users.is_active) saat HR
        // mengaktifkan kembali status karyawan.
        //
        // Akar masalah: ada DUA kolom "aktif" yang terpisah -- employees.is_active
        // (status kepegawaian, diatur toggle "Status" di form ini) dan
        // users.is_active (kunci akun, di-set false OTOMATIS oleh
        // AuthController.login() saat user 3x salah password). Form ini SELAMA
        // INI cuma menyentuh employees.is_active, jadi walau HR sudah pilih
        // "Aktif" di sini, users.is_active tetap false dan login tetap ditolak
        // (lihat pengecekan `if (!user.getIsActive())` di AuthController.login()).
        //
        // Karena label form ini "status keaktifan akun" (bukan cuma status
        // kepegawaian), yang paling sesuai ekspektasi HR: begitu status
        // di-set "Aktif", otomatis buka juga kunci login-nya.
        if (Boolean.TRUE.equals(request.getIsActive()) && employee.getUser() != null) {
            User akunLogin = employee.getUser();
            boolean akunSedangTerkunci = !Boolean.TRUE.equals(akunLogin.getIsActive())
                    || akunLogin.getFailedAttempts() > 0;

            if (akunSedangTerkunci) {
                akunLogin.setIsActive(true);
                akunLogin.setFailedAttempts(0);
                userRepository.save(akunLogin);

                activityLogService.log(
                        authentication.getName(),
                        getCurrentUserId(authentication),
                        "ACCOUNT_UNLOCKED",
                        "users",
                        akunLogin.getUserId(),
                        "Akun login " + akunLogin.getUsername() + " dibuka kembali (unlock) karena status karyawan diaktifkan oleh HR",
                        httpRequest
                );
            }
        }

        // [BARU] Tanggal gabung
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