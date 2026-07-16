package sys.hris.sims.profile.controller;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.entity.EmergencyContactRelationship;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.employee.repository.EmergencyContactRelationshipRepository;
import sys.hris.sims.profile.dto.ProfileResponse;
import sys.hris.sims.profile.dto.UpdateProfileRequest;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final EmergencyContactRelationshipRepository relationshipRepository;

    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(toResponse(currentUser(authentication)));
    }

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> updateMyProfile(@ModelAttribute UpdateProfileRequest request, Authentication authentication) {
        User user = currentUser(authentication);
        if (hasText(request.getEmail())) user.setEmail(request.getEmail().trim());

        Employee employee = employeeRepository.findFirstByUser_Username(user.getUsername()).orElse(null);
        if (employee != null) {
            if (hasText(request.getFullName())) employee.setFullName(request.getFullName().trim());
            if (hasText(request.getAddress())) employee.setAddress(request.getAddress().trim());
            if (hasText(request.getPhoneNumber())) employee.setPhoneNumber(request.getPhoneNumber().trim());
            if (hasText(request.getEmergencyContactPhone())) employee.setEmergencyContactPhone(request.getEmergencyContactPhone().trim());
            if (hasText(request.getEmergencyContactRelationship())) {
                EmergencyContactRelationship relationship = relationshipRepository.findByNameIgnoreCase(request.getEmergencyContactRelationship().trim());
                if (relationship == null) return ResponseEntity.badRequest().body("Hubungan kontak darurat tidak valid");
                employee.setEmergencyContactRelationship(relationship);
            }
            if (request.getPhoto() != null && !request.getPhoto().isEmpty()) employee.setPhoto(storePhoto(request));
            employeeRepository.save(employee);
        }
        userRepository.save(user);
        return ResponseEntity.ok(toResponse(user));
    }

    private User currentUser(Authentication authentication) {
        return Optional.ofNullable(userRepository.findByUsername(authentication.getName()))
                .orElseThrow(() -> new IllegalArgumentException("User tidak ditemukan"));
    }

    private ProfileResponse toResponse(User user) {
        Employee employee = employeeRepository.findFirstByUser_Username(user.getUsername()).orElse(null);
        String role = user.getRoleId() == null ? "" : user.getRoleId().getRoleName();
        return ProfileResponse.builder()
                .namaLengkap(employee == null ? user.getUsername() : employee.getFullName())
                .nikKaryawan(employee == null ? "-" : nullToDash(employee.getNikKaryawan()))
                .jabatan(role)
                .alamatLengkap(employee == null ? "-" : nullToDash(employee.getAddress()))
                .email(nullToDash(user.getEmail()))
                .nomorTelepon(employee == null ? "-" : nullToDash(employee.getPhoneNumber()))
                .divisi(employee == null || employee.getDivisi() == null ? "-" : employee.getDivisi().getNamaDivisi())
                .tanggalBergabung(employee == null || employee.getJoinDate() == null ? "-" : employee.getJoinDate().format(DateTimeFormatter.ofPattern("d MMMM uuuu")))
                .nomorTeleponDarurat(employee == null ? "-" : nullToDash(employee.getEmergencyContactPhone()))
                .hubunganDarurat(employee == null || employee.getEmergencyContactRelationship() == null ? "" : employee.getEmergencyContactRelationship().getName())
                .photoUrl(employee == null ? null : photoUrl(employee.getPhoto()))
                .build();
    }

    private String storePhoto(UpdateProfileRequest request) {
        try {
            Path directory = Paths.get("uploads", "photos");
            Files.createDirectories(directory);
            String filename = UUID.randomUUID() + "_" + request.getPhoto().getOriginalFilename();
            Path target = directory.resolve(filename);
            Files.copy(request.getPhoto().getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return target.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Gagal menyimpan foto profil", exception);
        }
    }

    private String photoUrl(String photo) {
        if (!hasText(photo)) return null;
        String normalised = photo.replace('\\', '/');
        return "/" + (normalised.startsWith("uploads/") ? normalised : "uploads/photos/" + Paths.get(normalised).getFileName());
    }

    private String nullToDash(String value) { return hasText(value) ? value : "-"; }
    private boolean hasText(String value) { return value != null && !value.isBlank(); }
}
