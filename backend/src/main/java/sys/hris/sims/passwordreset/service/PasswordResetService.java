package sys.hris.sims.passwordreset.service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import sys.hris.sims.common.service.HiddenAccountPolicy;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.notification.service.NotificationService;
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
    private final NotificationService notificationService; // [BARU] notifikasi lonceng disimpan di database
    private final HiddenAccountPolicy hiddenAccountPolicy; // [BARU] superadmin & dev tidak bisa direset lewat jalur ini

    public PasswordResetService(
            PasswordResetRequestRepository passwordResetRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmployeeRepository employeeRepository,
            NotificationService notificationService,
            HiddenAccountPolicy hiddenAccountPolicy) {

        this.passwordResetRepository = passwordResetRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.employeeRepository = employeeRepository;
        this.notificationService = notificationService;
        this.hiddenAccountPolicy = hiddenAccountPolicy;
    }

    public PasswordResetResponse createRequest(ForgotPasswordRequest request) {

        User user = userRepository.findByUsername(request.getUsername());

        // [UBAH] Anti user-enumeration: username tidak ada, akun tersembunyi (superadmin & dev),
        // atau permintaan PENDING yang sudah ada -> balasan SAMA PERSIS dengan kasus sukses
        // (tanpa error, tanpa email, tanpa notifikasi baru ke HRD).
        if (user == null
                || hiddenAccountPolicy.isHiddenUser(user)
                || passwordResetRepository.existsByUserAndStatus(user, "PENDING")) {
            return genericResponse(request.getUsername());
        }

        PasswordResetRequest resetRequest = PasswordResetRequest.builder()
                .user(user)
                .status("PENDING")
                .requestedAt(LocalDateTime.now())
                .build();

        passwordResetRepository.save(resetRequest);

        // [BARU] Kabari semua HRD_ADMIN & SUPER_ADMIN lewat notifikasi database.
        PendingPasswordResetResponse detail = toPendingResponse(resetRequest);
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("requestId", detail.getId());
        params.put("userId", detail.getUserId());
        params.put("username", detail.getUsername());
        params.put("email", detail.getEmail());
        params.put("employeeId", detail.getEmployeeId());
        params.put("employeeName", detail.getEmployeeName());
        params.put("position", detail.getPosition());
        params.put("divisiName", detail.getDivisiName());
        params.put("requestedAt", String.valueOf(detail.getRequestedAt()));
        try {
            notificationService.notifyUsers(notificationService.findPasswordResetRecipients(),
                    NotificationService.TYPE_PASSWORD_RESET, resetRequest.getId(), params);
        } catch (Exception ex) {
            // Permintaan reset sudah tersimpan; gagal membuat notifikasi tidak boleh membatalkannya.
            System.err.println("Gagal membuat notifikasi reset sandi: " + ex.getMessage());
        }

        // [UBAH] Email & id tidak lagi dikembalikan ke pemanggil publik (kebocoran data).
        return genericResponse(user.getUsername());
    }

    // [BARU] Balasan seragam untuk endpoint publik forgot-password.
    private PasswordResetResponse genericResponse(String username) {
        return PasswordResetResponse.builder()
                .id(null)
                .username(username)
                .email(null)
                .status("PENDING")
                .requestedAt(LocalDateTime.now())
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
                .filter(item -> !hiddenAccountPolicy.isHiddenUser(item.getUser())) // [BARU]
                .map(this::toPendingResponse)
                .collect(Collectors.toList());
    }

    private PendingPasswordResetResponse toPendingResponse(PasswordResetRequest request) {
        User user = request.getUser();

        // Tidak semua User pasti punya baris di tabel employees (mis. akun
        // sistem), jadi employeeId dkk boleh null -- frontend perlu menangani
        // kemungkinan ini (tombol "Proses" disembunyikan/nonaktif kalau null).
        Employee employee = employeeRepository.findFirstByUserOrderByEmployeeIdAsc(user).orElse(null);

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
        // [UBAH] Hitung hanya permintaan akun biasa (angka badge tidak boleh membocorkan akun tersembunyi).
        return passwordResetRepository.findByStatus("PENDING").stream()
                .filter(item -> !hiddenAccountPolicy.isHiddenUser(item.getUser()))
                .count();
    }

    public String approveRequest(
            Long requestId,
            ApprovePasswordResetRequest request,
            Authentication authentication) {

        PasswordResetRequest resetRequest = passwordResetRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Permintaan reset tidak ditemukan"));

        if (hiddenAccountPolicy.isHiddenUser(resetRequest.getUser())) { // [BARU] HRD tidak boleh me-reset password akun tersembunyi
            throw new RuntimeException("Permintaan reset tidak ditemukan");
        }

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

        if (hiddenAccountPolicy.isHiddenUser(resetRequest.getUser())) { // [BARU]
            throw new RuntimeException("Permintaan reset tidak ditemukan");
        }

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