package sys.hris.sims.auth.controller;

import jakarta.transaction.Transactional;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import sys.hris.sims.auth.dto.LoginRequest;
import sys.hris.sims.auth.dto.LoginResponse;
import sys.hris.sims.auth.dto.RegisterRequest;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.entity.EmergencyContactRelationship;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.employee.repository.EmergencyContactRelationshipRepository;
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.repository.DivisiRepository;
import sys.hris.sims.role.entity.Roles;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.role.repository.RoleRepository;
import sys.hris.sims.security.JwtService;
import sys.hris.sims.user.repository.UserRepository;
import sys.hris.sims.auth.service.AuthService;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import org.springframework.security.core.Authentication;
import sys.hris.sims.auth.dto.ChangePasswordRequest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmployeeRepository employeeRepository;
    private final EmergencyContactRelationshipRepository relationshipRepository;
    private final DivisiRepository divisiRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;
    private final AuthService authService;

    public AuthController(UserRepository userRepository,
                          RoleRepository roleRepository,
                          EmployeeRepository employeeRepository,
                          EmergencyContactRelationshipRepository relationshipRepository,
                          DivisiRepository divisiRepository,
                          JwtService jwtService,
                          PasswordEncoder passwordEncoder,
                          ActivityLogService activityLogService,
                          AuthService authService) {

        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.employeeRepository = employeeRepository;
        this.relationshipRepository = relationshipRepository;
        this.divisiRepository = divisiRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
        this.authService = authService;
    }

    // helper method ambil userId dari token
    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    // UBAH DARI @RequestBody MENJADI @ModelAttribute & Tambah consumes
    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> register(@ModelAttribute RegisterRequest request,
                                      Authentication authentication,
                                      HttpServletRequest httpRequest) {
        User existing = userRepository.findByUsername(request.getUsername());
        if (existing != null) {
            // activity log
            activityLogService.log(authentication != null ? authentication.getName() : "System",
                authentication != null ? getCurrentUserId(authentication) : null,
                "REGISTER_FAILED", "users", null, "Gagal register: Username sudah dipakai (" + request.getUsername() + ")", httpRequest);

            return ResponseEntity.status(400).body("Username already in use");
        }

        if (hasEmployeeProfile(request) && !isEmployeeProfileComplete(request)) {
            return ResponseEntity.status(400).body("fullName and gender are required to create employee profile");
        }

        Roles role = roleRepository.findById(request.getRoleId()).orElse(null);
        if (role == null) {
            // activity log
            activityLogService.log(authentication != null ? authentication.getName() : "System",
                authentication != null ? getCurrentUserId(authentication) : null,
                "REGISTER_FAILED", "roles", request.getRoleId(), "Gagal register: Role tidak ditemukan", httpRequest);

            return ResponseEntity.status(400).body("Role not found");
        }

        // Divisi wajib divalidasi di sini (sebelum user disimpan), supaya kalau
        // divisiId tidak valid, tidak ada User "nyangkut" tanpa Employee.
        Divisi divisi = null;
        if (isEmployeeProfileComplete(request)) {
            if (request.getDivisiId() != null) {
                divisi = divisiRepository.findById(request.getDivisiId()).orElse(null);
            }
            if (divisi == null) {
                return ResponseEntity.status(400).body("Divisi tidak ditemukan");
            }
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .roleId(role)
                .failedAttempts(0)
                .isActive(true)
                .build();

        userRepository.save(user);

        if (isEmployeeProfileComplete(request)) {

            // 1. Cari Relasi Kontak Darurat (Jika dikirim)
            EmergencyContactRelationship rel = null;
            if (request.getEmergencyContactRelationshipId() != null) {
                rel = relationshipRepository.findById(request.getEmergencyContactRelationshipId()).orElse(null);
            }

            // 2. Proses Simpan Foto (Jika dikirim)
            String savedPhotoPath = null;
            if (request.getPhoto() != null && !request.getPhoto().isEmpty()) {
                try {
                    MultipartFile file = request.getPhoto();
                    Path uploadPath = Paths.get("uploads/photos/");
                    if (!Files.exists(uploadPath)) {
                        Files.createDirectories(uploadPath);
                    }
                    String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
                    Path filePath = uploadPath.resolve(fileName);
                    Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                    savedPhotoPath = filePath.toString();
                } catch (Exception e) {
                    return ResponseEntity.status(500).body("Gagal menyimpan foto: " + e.getMessage());
                }
            }

            // 3. Simpan Employee dengan tambahan NIK, Kontak, dan Foto
            Employee employee = Employee.builder()
                    .user(user)
                    .divisi(divisi)
                    .fullName(request.getFullName())
                    .address(request.getAddress())
                    .phoneNumber(request.getPhoneNumber())
                    .gender(request.getGender())
                    .isActive(true)
                    // Field Baru:
                    .nikKaryawan(request.getNikKaryawan())
                    .emergencyContactName(request.getEmergencyContactName())
                    .emergencyContactPhone(request.getEmergencyContactPhone())
                    .emergencyContactRelationship(rel)
                    .photo(savedPhotoPath)
                    .joinDate(request.getJoinDate() != null && !request.getJoinDate().isBlank() 
                              ? LocalDate.parse(request.getJoinDate()) 
                              : null)
                    .build();
            employeeRepository.save(employee);
        }

        // catat activity log
        activityLogService.log(authentication != null ? authentication.getName() : "System",
                authentication != null ? getCurrentUserId(authentication) : null,
                "REGISTER_USER",
                "users",
                user.getUserId(),
                "Membuat user baru: " + request.getUsername(),
                httpRequest);

        return ResponseEntity.ok("User successfully created");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findByUsername(request.getUsername());

        if (user == null) {
            // catat log username tidak ditemukan
            activityLogService.log(
                request.getUsername(),
                null,
                "LOGIN_FAILED",
                "users",
                null,
                "Gagal login - username tidak ditemukan: " + request.getUsername(),
                httpRequest
            );

            return ResponseEntity.status(401).body("Invalid username or password");
        }

        Employee employee = employeeRepository.findFirstByUserOrderByEmployeeIdAsc(user).orElse(null);

        if (employee != null && !employee.getIsActive()) {
            activityLogService.log(
                    user.getUsername(),
                    user.getUserId(),
                    "LOGIN_BLOCKED",
                    "employees",
                    employee.getEmployeeId(),
                    "Login ditolak: Karyawan sudah diberhentikan (Status: Non-Aktif)",
                    httpRequest
            );

            return ResponseEntity.status(403)
                    .body("Akun tidak dapat diakses karena status karyawan sudah tidak aktif.");
        }

        if (!user.getIsActive()) {

            activityLogService.log(
                    user.getUsername(),
                    user.getUserId(),
                    "LOGIN_BLOCKED",
                    "users",
                    user.getUserId(),
                    "Login ditolak karena akun dinonaktifkan",
                    httpRequest
            );

            return ResponseEntity.status(403)
                    .body("Akun telah dinonaktifkan. Silakan hubungi HR.");
        }

        boolean isValid = isPasswordValid(request.getPassword(), user);

        if (!isValid) {

            user.setFailedAttempts(user.getFailedAttempts() + 1);

            if (user.getFailedAttempts() >= 3) {

                user.setIsActive(false);

                activityLogService.log(
                        user.getUsername(),
                        user.getUserId(),
                        "ACCOUNT_LOCKED",
                        "users",
                        user.getUserId(),
                        "Akun dinonaktifkan karena 3 kali gagal login",
                        httpRequest
                );
            }

            userRepository.save(user);

            activityLogService.log(
                    request.getUsername(),
                    user.getUserId(),
                    "LOGIN_FAILED",
                    "users",
                    null,
                    "Gagal login",
                    httpRequest
            );

            return ResponseEntity.status(401)
                    .body("Invalid username or password");
        }
        if (user.getFailedAttempts() > 0) {
            user.setFailedAttempts(0);
            userRepository.save(user);
        }

        String role = user.getRoleId().getRoleName();
        String token = jwtService.generateToken(user.getUsername(), role);

        // catat activity log
        activityLogService.log(user.getUsername(), user.getUserId(), "LOGIN", "users", user.getUserId(), "Berhasil login", httpRequest);

        return ResponseEntity.ok(new LoginResponse(token, user.getUsername(), role));
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        // Panggil service
        authService.changePassword(authentication, request);

        // Catat log sukses
        activityLogService.log(
                authentication.getName(),
                getCurrentUserId(authentication),
                "CHANGE_PASSWORD",
                "users",
                getCurrentUserId(authentication),
                "Berhasil mengubah password",
                httpRequest
        );

        return ResponseEntity.ok(
                authService.changePassword(authentication, request));
    }

    private boolean isPasswordValid(String rawPassword, User user) {
        String storedPassword = user.getPassword();

        if (storedPassword != null && storedPassword.startsWith("$2")) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        boolean plainPasswordMatches = storedPassword != null && storedPassword.equals(rawPassword);
        if (plainPasswordMatches) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
        }

        return plainPasswordMatches;
    }

    private boolean hasEmployeeProfile(RegisterRequest request) {
        return !isBlank(request.getFullName())
                || !isBlank(request.getGender())
                || !isBlank(request.getAddress())
                || !isBlank(request.getPhoneNumber());
    }

    private boolean isEmployeeProfileComplete(RegisterRequest request) {
        return !isBlank(request.getFullName()) && !isBlank(request.getGender());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}