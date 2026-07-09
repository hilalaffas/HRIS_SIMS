package sys.hris.sims.auth.controller;

import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import sys.hris.sims.auth.dto.LoginRequest;
import sys.hris.sims.auth.dto.LoginResponse;
import sys.hris.sims.auth.dto.RegisterRequest;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.role.entity.Roles;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.role.repository.RoleRepository;
import sys.hris.sims.security.JwtService;
import sys.hris.sims.user.repository.UserRepository;
import sys.hris.sims.auth.service.AuthService;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import org.springframework.security.core.Authentication;
import sys.hris.sims.auth.dto.ChangePasswordRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmployeeRepository employeeRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;
    private final AuthService authService;

    public AuthController(UserRepository userRepository,
                      RoleRepository roleRepository,
                      EmployeeRepository employeeRepository,
                      JwtService jwtService,
                      PasswordEncoder passwordEncoder,
                      ActivityLogService activityLogService,
                      AuthService authService) {

    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.employeeRepository = employeeRepository;
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

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> register(@RequestBody RegisterRequest request,
                                      Authentication authentication,
                                      HttpServletRequest httpRequest) {
        User existing = userRepository.findByUsername(request.getUsername());
        if (existing != null) {
            return ResponseEntity.status(400).body("Username already in use");
        }

        if (hasEmployeeProfile(request) && !isEmployeeProfileComplete(request)) {
            return ResponseEntity.status(400).body("fullName and gender are required to create employee profile");
        }

        Roles role = roleRepository.findById(request.getRoleId()).orElse(null);
        if (role == null) {
            return ResponseEntity.status(400).body("Role not found");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .roleId(role)
                .build();

        userRepository.save(user);

        if (isEmployeeProfileComplete(request)) {
            Employee employee = Employee.builder()
                    .user(user)
                    .fullName(request.getFullName())
                    .address(request.getAddress())
                    .phoneNumber(request.getPhoneNumber())
                    .gender(request.getGender())
                    .isActive(true)
                    .build();
            employeeRepository.save(employee);
        }

        // catat activity log
        activityLogService.log(authentication.getName(),
                getCurrentUserId(authentication),
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
        boolean isValid = isPasswordValid(request.getPassword(), user);
        if (!isValid) {
            // catat activity log
            activityLogService.log(request.getUsername(), user.getUserId(), "LOGIN_FAILED", "users", null, "Gagal login", httpRequest);
            return ResponseEntity.status(401).body("Invalid username or password");
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
        Authentication authentication) {

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
