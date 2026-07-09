package sys.hris.sims.passwordreset.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import sys.hris.sims.passwordreset.dto.ApprovePasswordResetRequest;
import sys.hris.sims.passwordreset.dto.ForgotPasswordRequest;
import sys.hris.sims.passwordreset.dto.PasswordResetResponse;
import sys.hris.sims.passwordreset.entity.PasswordResetRequest;
import sys.hris.sims.passwordreset.repository.PasswordResetRequestRepository;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

@Service
public class PasswordResetService {

    private final PasswordResetRequestRepository passwordResetRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetService(
            PasswordResetRequestRepository passwordResetRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.passwordResetRepository = passwordResetRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public PasswordResetResponse createRequest(ForgotPasswordRequest request) {

        User user = userRepository.findByUsername(request.getUsername());

        if (user == null) {
            throw new RuntimeException("Username tidak ditemukan");
        }

        PasswordResetRequest resetRequest = PasswordResetRequest.builder()
                .user(user)
                .status("PENDING")
                .requestedAt(LocalDateTime.now())
                .build();

        passwordResetRepository.save(resetRequest);

        return PasswordResetResponse.builder()
                .id(resetRequest.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .status(resetRequest.getStatus())
                .requestedAt(resetRequest.getRequestedAt())
                .approvedBy(null)
                .approvedAt(null)
                .notes(null)
                .build();
    }

    public List<PasswordResetRequest> getPendingRequests() {
        return passwordResetRepository.findByStatus("PENDING");
    }

    public long getPendingCount() {
        return passwordResetRepository.countByStatus("PENDING");
    }

    public String approveRequest(
            Long requestId,
            ApprovePasswordResetRequest request,
            Authentication authentication) {

        PasswordResetRequest resetRequest = passwordResetRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Permintaan reset tidak ditemukan"));

        if (!resetRequest.getStatus().equals("PENDING")) {
            throw new RuntimeException("Permintaan sudah diproses");
        }

        User user = resetRequest.getUser();

        // Ubah password menjadi password dummy
        user.setPassword(passwordEncoder.encode(request.getDummyPassword()));
        userRepository.save(user);

        User hr = userRepository.findByUsername(authentication.getName());

        if (hr == null) {
            throw new RuntimeException("HR tidak ditemukan");
        }

        resetRequest.setStatus("APPROVED");
        resetRequest.setApprovedAt(LocalDateTime.now());
        resetRequest.setApprovedBy(hr);
        resetRequest.setNotes(request.getNotes());

        passwordResetRepository.save(resetRequest);

        return "Password berhasil direset.";
    }
}