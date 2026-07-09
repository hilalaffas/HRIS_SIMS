package sys.hris.sims.auth.service;

import jakarta.transaction.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import sys.hris.sims.auth.dto.ChangePasswordRequest;
import sys.hris.sims.auth.dto.RegisterRequest;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.role.entity.Roles;
import sys.hris.sims.role.repository.RoleRepository;
import sys.hris.sims.security.JwtService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       RoleRepository rolesRepository,
                       EmployeeRepository employeeRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = rolesRepository;
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public String register(RegisterRequest request) {

        User existing = userRepository.findByUsername(request.getUsername());

        if (existing != null) {
            throw new RuntimeException("Username sudah digunakan");
        }

        if (hasEmployeeProfile(request) && !isEmployeeProfileComplete(request)) {
            throw new RuntimeException("fullName dan gender wajib diisi untuk membuat profil employee");
        }

        Roles role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role tidak ditemukan"));

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

        return "User berhasil dibuat";
    }

    @Transactional
    public String changePassword(Authentication authentication, ChangePasswordRequest request) {

        User user = userRepository.findByUsername(authentication.getName());

        if (user == null) {
            throw new RuntimeException("User tidak ditemukan");
        }

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("Password lama salah");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Konfirmasi password tidak sesuai");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        userRepository.save(user);

        return "Password berhasil diubah.";
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