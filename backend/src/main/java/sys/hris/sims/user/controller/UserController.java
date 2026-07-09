package sys.hris.sims.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import sys.hris.sims.user.dto.UpdateUserRequest;
import sys.hris.sims.user.dto.UserResponse;
import sys.hris.sims.role.entity.Roles;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.role.repository.RoleRepository;
import sys.hris.sims.user.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;
import sys.hris.sims.activity_logs.service.ActivityLogService;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository userRepository;
    private final RoleRepository rolesRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;

    public UserController(UserRepository userRepository,
                          RoleRepository rolesRepository,
                          PasswordEncoder passwordEncoder,
                          ActivityLogService activityLogService) {
        this.userRepository = userRepository;
        this.rolesRepository = rolesRepository;
        this.passwordEncoder = passwordEncoder;
        this.activityLogService = activityLogService;
    }

    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication, HttpServletRequest httpRequest) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(404).body("User tidak ditemukan");
        }
        UserResponse response = new UserResponse(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                user.getRoleId().getRoleName()
        );

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_USERS", "users", null, "Melihat data user", httpRequest);


        
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers(Authentication authentication, HttpServletRequest httpRequest) {
        List<User> users = userRepository.findAll();
        List<UserResponse> response = users.stream()
                .map(u -> new UserResponse(
                        u.getUserId(),
                        u.getUsername(),
                        u.getEmail(),
                        u.getRoleId().getRoleName()
                ))
                .collect(Collectors.toList());

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_ALL_USERS", "users", null, "Melihat semua data user", httpRequest);

        return ResponseEntity.ok(response);
    }

   @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {

            activityLogService.log(
                    authentication.getName(),
                    getCurrentUserId(authentication),
                    "UPDATE_USER_FAILED",
                    "users",
                    id,
                    "Gagal update user. User dengan id " + id + " tidak ditemukan",
                    httpRequest);

            return ResponseEntity.status(404).body("User tidak ditemukan");
        }

        if (request.getUsername() != null &&
                !request.getUsername().equals(user.getUsername())) {

            User existing = userRepository.findByUsername(request.getUsername());

            if (existing != null) {

                activityLogService.log(
                        authentication.getName(),
                        getCurrentUserId(authentication),
                        "UPDATE_USER_FAILED",
                        "users",
                        id,
                        "Gagal update user. Username '" + request.getUsername() + "' sudah digunakan",
                        httpRequest);

                return ResponseEntity.status(400).body("Username sudah digunakan");
            }

            user.setUsername(request.getUsername());
        }

        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }

        if (request.getIdRole() != null) {

            Roles role = rolesRepository.findById(request.getIdRole()).orElse(null);

            if (role == null) {

                activityLogService.log(
                        authentication.getName(),
                        getCurrentUserId(authentication),
                        "UPDATE_USER_FAILED",
                        "users",
                        id,
                        "Gagal update user. Role dengan id " + request.getIdRole() + " tidak ditemukan",
                        httpRequest);

                return ResponseEntity.status(400).body("Role tidak ditemukan");
            }

            user.setRoleId(role);
        }

        if (request.getPassword() != null &&
                !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        userRepository.save(user);

        activityLogService.log(
                authentication.getName(),
                getCurrentUserId(authentication),
                "UPDATE_USER",
                "users",
                user.getUserId(),
                "Berhasil mengupdate user: " + user.getUsername(),
                httpRequest);

        UserResponse response = new UserResponse(
                user.getUserId(),
                user.getUsername(),
                user.getEmail(),
                user.getRoleId().getRoleName()
        );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body("User tidak ditemukan");
        }
        userRepository.deleteById(id);

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "DELETE_USER", "users", id, "Berhasil hapus user: " + user.getUsername(), httpRequest);

        return ResponseEntity.ok("User berhasil dihapus");
    }
}