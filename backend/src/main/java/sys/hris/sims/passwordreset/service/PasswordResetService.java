package sys.hris.sims.passwordreset.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.passwordreset.dto.ApprovePasswordResetRequest;
import sys.hris.sims.passwordreset.dto.ForgotPasswordRequest;
import sys.hris.sims.passwordreset.dto.PasswordResetResponse;
import sys.hris.sims.passwordreset.dto.PendingPasswordResetResponse;
import sys.hris.sims.passwordreset.entity.PasswordResetRequest;
import sys.hris.sims.passwordreset.repository.PasswordResetRequestRepository;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

@Service
public class PasswordResetService {

    private final PasswordResetRequestRepository passwordResetRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    // [BARU] dibutuhkan untuk enrich pending request dengan employeeId, nama,
    // jabatan, & divisi -- lihat getPendingRequests() di bawah.
    private final EmployeeRepository employeeRepository;

    public PasswordResetService(
            PasswordResetRequestRepository passwordResetRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmployeeRepository employeeRepository) {

        this.passwordResetRepository = passwordResetRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.employeeRepository = employeeRepository;
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

    // [UBAH] Sebelumnya mengembalikan List<PasswordResetRequest> (entity
    // mentah) langsung ke controller. Sekarang di-map ke DTO yang sudah
    // diperkaya data karyawan (employeeId, employeeName, position, divisiName)
    // supaya lonceng notifikasi HR bisa langsung redirect ke baris karyawan
    // yang tepat begitu tombol "Proses" diklik di frontend.
    public List<PendingPasswordResetResponse> getPendingRequests() {
        return passwordResetRepository.findByStatus("PENDING").stream()
                .map(this::toPendingResponse)
                .collect(Collectors.toList());
    }

    private PendingPasswordResetResponse toPendingResponse(PasswordResetRequest request) {
        User user = request.getUser();

        // Tidak semua User pasti punya baris di tabel employees (mis. akun
        // sistem), jadi employeeId dkk boleh null -- frontend perlu menangani
        // kemungkinan ini (tombol "Proses" disembunyikan/nonaktif kalau null).
        Employee employee = employeeRepository.findByUser(user).orElse(null);

        return PendingPasswordResetResponse.builder()
                .id(request.getId())
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .employeeId(employee != null ? employee.getEmployeeId() : null)
                .employeeName(employee != null ? employee.getFullName() : null)
                .position(employee != null ? employee.getPosition() : null)
                .divisiName(employee != null && employee.getDivisi() != null
                        ? employee.getDivisi().getNamaDivisi() : null)
                .requestedAt(request.getRequestedAt())
                .build();
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

    /**
     * [BARU] Menandai satu permintaan reset sebagai selesai TANPA mengubah
     * password lagi. Dipanggil dari UserController.updateUser() saat HR
     * mengganti password langsung lewat ModalDetailKaryawan (alur notifikasi
     * lonceng -> klik "Proses" -> buka baris karyawan -> ganti password).
     * Password-nya sendiri sudah di-encode & disimpan oleh UserController
     * SEBELUM method ini dipanggil, jadi di sini murni update status supaya
     * tidak ter-hash dua kali dan tidak tercatat approvedBy yang salah.
     */
    public void markResolved(Long requestId, Authentication authentication) {

        PasswordResetRequest resetRequest = passwordResetRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Permintaan reset tidak ditemukan"));

        if (!resetRequest.getStatus().equals("PENDING")) {
            // Sudah diproses sebelumnya (mis. di-klik dari 2 tab) -- diamkan
            // saja, jangan gagalkan keseluruhan proses ganti password.
            return;
        }

        User hr = userRepository.findByUsername(authentication.getName());
        if (hr == null) {
            throw new RuntimeException("HR tidak ditemukan");
        }

        resetRequest.setStatus("APPROVED");
        resetRequest.setApprovedAt(LocalDateTime.now());
        resetRequest.setApprovedBy(hr);
        resetRequest.setNotes("Diproses lewat form edit data karyawan");

        passwordResetRepository.save(resetRequest);
    }
}