package sys.hris.sims.attendance.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.common.service.ApprovalScopeService;
import sys.hris.sims.common.service.ApprovalScopeService.ApprovalScope;
import sys.hris.sims.attendance.dto.AttendanceResponse;
import sys.hris.sims.attendance.dto.AttendanceSubmitRequest;
import sys.hris.sims.attendance.dto.PermissionSubmitRequest;
import sys.hris.sims.attendance.entity.Attendance;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.storage.CloudinaryService;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    // [BARU] Jam batas dianggap "Tepat waktu" untuk check-in Masuk.
    // Sesuaikan kalau kebijakan jam masuk kantor berubah.
    private static final LocalTime ON_TIME_CUTOFF = LocalTime.of(8, 0);

    // [BARU] Durasi kerja minimum sebelum boleh check-out TANPA alasan. Di bawah
    // ini, keterangan (alasan pulang cepat) wajib diisi.
    private static final Duration MIN_WORK_DURATION = Duration.ofHours(8);

    // [BARU] Batas lama izin sakit dalam satu pengajuan (hari kalender).
    private static final int MAX_SICK_DAYS = 30;

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final CloudinaryService cloudinaryService;
    // [BARU] Aturan siapa boleh melihat / memutuskan sakit siapa.
    private final ApprovalScopeService approvalScopeService;
    // [BARU] Nama lokasi dari koordinat GPS (Google Geocoding, opsional).
    private final ReverseGeocodingService reverseGeocodingService;

    public List<AttendanceResponse> getMyHistory(String username) {
        Employee employee = resolveEmployee(username);
        return attendanceRepository.findByEmployee_EmployeeIdOrderByRecordedAtDesc(employee.getEmployeeId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<AttendanceResponse> getAllHistory() {
        return attendanceRepository.findAllByOrderByRecordedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public AttendanceResponse submit(String username, AttendanceSubmitRequest request) {
        Employee employee = resolveEmployee(username);

        String action = normalize(request.getAction());
        if (!action.equals("MASUK") && !action.equals("KELUAR")) {
            throw new IllegalArgumentException("Jenis absensi tidak valid. Gunakan Masuk atau Keluar.");
        }

        String reason = request.getReason() == null || request.getReason().isBlank()
                ? "ABSEN"
                : normalize(request.getReason());
        if (!List.of("ABSEN", "SAKIT", "IZIN").contains(reason)) {
            throw new IllegalArgumentException("Jenis keterangan tidak valid. Gunakan Absen, Sakit, atau Izin.");
        }
        if (!reason.equals("ABSEN") && (request.getNote() == null || request.getNote().isBlank())) {
            throw new IllegalArgumentException("Keterangan wajib diisi untuk absensi " + (reason.equals("SAKIT") ? "Sakit" : "Izin") + ".");
        }

        // [BARU] Batas panjang keterangan = kolom DB (attendances.note VARCHAR(255)).
        // Tanpa ini, input terlalu panjang berakhir sebagai error 500 dari database,
        // bukan pesan yang jelas ke pengguna.
        if (request.getNote() != null && request.getNote().trim().length() > 255) {
            throw new IllegalArgumentException("Keterangan maksimal 255 karakter.");
        }

        // [BARU] Koordinat GPS WAJIB -- tanpa ini absensi tidak bisa dikirim.
        // Frontend seharusnya sudah mencegah submit tanpa lokasi, ini adalah
        // jaring pengaman kedua di sisi server.
        if (request.getLatitude() == null || request.getLongitude() == null) {
            throw new IllegalArgumentException("Lokasi GPS wajib diaktifkan untuk melakukan absensi.");
        }
        if (request.getLatitude() < -90 || request.getLatitude() > 90
                || request.getLongitude() < -180 || request.getLongitude() > 180) {
            throw new IllegalArgumentException("Koordinat lokasi tidak valid.");
        }

        if (request.getPhoto() == null || request.getPhoto().isEmpty()) {
            throw new IllegalArgumentException("Foto bukti kehadiran wajib diunggah.");
        }

        LocalDate today = LocalDate.now();
        if (attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAction(employee.getEmployeeId(), today, action)) {
            throw new IllegalStateException(
                    action.equals("MASUK")
                            ? "Anda sudah melakukan check-in hari ini."
                            : "Anda sudah melakukan check-out hari ini.");
        }
        // [BARU] Masih dalam masa izin sakit multi-hari (pengajuan hari sebelumnya).
        if (action.equals("MASUK") && hasActiveSick(employee.getEmployeeId(), today)) {
            throw new IllegalStateException("Anda tercatat sakit hari ini, absen masuk tidak diperlukan.");
        }
        if (action.equals("KELUAR")
                && !attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAction(employee.getEmployeeId(), today, "MASUK")) {
            throw new IllegalStateException("Anda belum melakukan check-in hari ini.");
        }
        // [BARU] Hari ini sudah tercatat Sakit/Izin -> tidak boleh check-out
        // (frontend sudah menonaktifkan tombol, ini pengaman di sisi server).
        if (action.equals("KELUAR")
                && attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndActionAndReasonIn(
                        employee.getEmployeeId(), today, "MASUK", List.of("SAKIT", "IZIN"))) {
            throw new IllegalStateException("Anda tercatat Sakit/Izin hari ini, check-out tidak diperlukan.");
        }

        // [BARU] Pulang cepat: check-out sebelum 8 jam kerja WAJIB menyertakan alasan.
        // Popup peringatan di frontend hanya UX; aturan ini menjaga agar request yang
        // dikirim langsung ke API pun tidak bisa melewatinya. Dihitung dengan jam
        // SERVER (sama seperti Attendance.prePersist()), bukan jam perangkat.
        if (action.equals("KELUAR") && (request.getNote() == null || request.getNote().isBlank())) {
            attendanceRepository
                    .findFirstByEmployee_EmployeeIdAndAttendanceDateAndAction(employee.getEmployeeId(), today, "MASUK")
                    .ifPresent(checkIn -> {
                        Duration worked = Duration.between(checkIn.getRecordedAt(), LocalDateTime.now());
                        if (worked.compareTo(MIN_WORK_DURATION) < 0) {
                            throw new IllegalArgumentException(
                                    "Durasi kerja Anda belum memenuhi 8 jam. Alasan pulang cepat wajib diisi.");
                        }
                    });
        }

        // [BARU] Nama lokasi dicari SERVER dari koordinat -- tidak menerima nama dari
        // klien supaya tidak bisa dipalsukan. Gagal/kosong tidak menghalangi absensi.
        String locationName = reverseGeocodingService
                .resolveName(request.getLatitude(), request.getLongitude())
                .orElse(null);

        String photoUrl;
        try {
            String publicId = "attendance-" + employee.getEmployeeId() + "-" + today + "-" + UUID.randomUUID();
            photoUrl = cloudinaryService.uploadAttendancePhoto(request.getPhoto(), publicId);
        } catch (IOException e) {
            throw new IllegalStateException("Gagal mengunggah foto absensi. Silakan coba lagi.", e);
        }

        Attendance attendance = Attendance.builder()
                .employee(employee)
                .action(action)
                .reason(reason)
                .status(resolveStatus(action, reason))
                .note(request.getNote())
                .approvalStatus(reason.equals("SAKIT") ? "PENDING" : "NOT_REQUIRED")
                .photoUrl(photoUrl)
                .latitude(BigDecimal.valueOf(request.getLatitude()))
                .longitude(BigDecimal.valueOf(request.getLongitude()))
                .locationName(locationName)
                .build();

        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    // [UBAH] Daftar pengajuan Sakit untuk tab "Izin Sakit" di Persetujuan Cuti:
    // hanya bawahan di divisi approver (lihat ApprovalScopeService).
    public List<AttendanceResponse> getSickApprovals(Authentication authentication) {
        ApprovalScope scope = approvalScopeService.resolve(authentication);
        return attendanceRepository.findByReasonAndActionOrderByRecordedAtDesc("SAKIT", "MASUK")
                .stream()
                .filter(attendance -> scope.canHandle(attendance.getEmployee()))
                .map(this::toResponse)
                .toList();
    }

    // [BARU] Pengajuan Izin / Sakit dari popup "Ajukan Izin / Sakit" -- TANPA selfie
    // & GPS.
    //  - SAKIT     : disimpan sebagai action MASUK + reason SAKIT (sama seperti sakit lama,
    //                jadi alur persetujuan Leader/SPV/Manager tidak berubah), plus lama
    //                izin (hari) dan surat dokter yang BOLEH menyusul (document_url null).
    //  - TERLAMBAT : pemberitahuan terlambat, disimpan sebagai action IZIN supaya tidak
    //                bentrok dengan absen Masuk yang tetap harus dilakukan; tidak perlu
    //                persetujuan.
    public AttendanceResponse submitPermission(String username, PermissionSubmitRequest request) {
        Employee employee = resolveEmployee(username);
        Long employeeId = employee.getEmployeeId();

        String type = normalize(request.getType());
        boolean isSick = type.equals("SAKIT");
        if (!isSick && !type.equals("TERLAMBAT")) {
            throw new IllegalArgumentException("Jenis izin tidak valid. Gunakan Sakit atau Terlambat.");
        }

        String note = request.getNote() == null ? "" : request.getNote().trim();
        if (note.isEmpty()) {
            throw new IllegalArgumentException("Keterangan wajib diisi.");
        }
        if (note.length() > 255) {
            throw new IllegalArgumentException("Keterangan maksimal 255 karakter.");
        }

        int days = isSick && request.getDays() != null ? request.getDays() : 1;
        if (days < 1 || days > MAX_SICK_DAYS) {
            throw new IllegalArgumentException("Lama izin sakit harus 1 sampai " + MAX_SICK_DAYS + " hari.");
        }

        LocalDate today = LocalDate.now();
        if (attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAction(employeeId, today, "MASUK")) {
            throw new IllegalStateException("Anda sudah tercatat check-in / sakit hari ini, pengajuan izin tidak bisa dibuat.");
        }
        if (isSick && hasActiveSick(employeeId, today)) {
            throw new IllegalStateException("Anda masih tercatat sakit hari ini dari pengajuan sebelumnya.");
        }
        if (!isSick && attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAction(employeeId, today, "IZIN")) {
            throw new IllegalStateException("Anda sudah mengajukan izin terlambat hari ini.");
        }

        // Surat dokter opsional saat pengajuan (boleh menyusul lewat uploadMedicalDocument).
        String documentUrl = null;
        MultipartFile document = request.getDocument();
        if (isSick && document != null && !document.isEmpty()) {
            documentUrl = storeMedicalDocument(employeeId, document);
        }

        Attendance attendance = Attendance.builder()
                .employee(employee)
                .action(isSick ? "MASUK" : "IZIN")
                .reason(isSick ? "SAKIT" : "IZIN")
                .status(isSick ? "SICK" : "IZIN")
                .note(note)
                .approvalStatus(isSick ? "PENDING" : "NOT_REQUIRED")
                .leaveDays(days)
                .documentUrl(documentUrl)
                .documentRequired(isSick)
                .build();

        return toResponse(attendanceRepository.save(attendance));
    }

    // [BARU] Upload surat dokter SUSULAN untuk pengajuan Sakit milik sendiri.
    // Hanya boleh sekali (selama masih kosong) supaya bukti yang sudah dilihat
    // approver tidak bisa diganti diam-diam.
    public AttendanceResponse uploadMedicalDocument(Long attendanceId, MultipartFile document, String username) {
        if (document == null || document.isEmpty()) {
            throw new IllegalArgumentException("File surat dokter wajib dipilih.");
        }

        Employee employee = resolveEmployee(username);
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Data absensi tidak ditemukan."));

        if (!attendance.getEmployee().getEmployeeId().equals(employee.getEmployeeId())) {
            throw new IllegalStateException("Anda tidak berwenang mengunggah surat untuk data ini.");
        }
        if (!"SAKIT".equals(attendance.getReason()) || !Boolean.TRUE.equals(attendance.getDocumentRequired())) {
            throw new IllegalArgumentException("Data ini tidak memerlukan surat dokter.");
        }
        if (attendance.getDocumentUrl() != null && !attendance.getDocumentUrl().isBlank()) {
            throw new IllegalStateException("Surat dokter sudah diunggah.");
        }

        attendance.setDocumentUrl(storeMedicalDocument(employee.getEmployeeId(), document));
        return toResponse(attendanceRepository.save(attendance));
    }

    private String storeMedicalDocument(Long employeeId, MultipartFile document) {
        try {
            String publicId = "medical-" + employeeId + "-" + LocalDate.now() + "-" + UUID.randomUUID();
            return cloudinaryService.uploadMedicalDocument(document, publicId);
        } catch (IOException e) {
            throw new IllegalStateException("Gagal mengunggah surat dokter. Silakan coba lagi.", e);
        }
    }

    // [BARU] true bila `date` masih tercakup pengajuan Sakit (tanggal pengajuan +
    // leaveDays - 1) yang belum ditolak. Dipakai untuk memblokir absen Masuk &
    // pengajuan ganda di tengah masa izin sakit multi-hari.
    private boolean hasActiveSick(Long employeeId, LocalDate date) {
        return attendanceRepository
                .findByEmployee_EmployeeIdAndReasonAndActionOrderByRecordedAtDesc(employeeId, "SAKIT", "MASUK")
                .stream()
                .filter(sick -> !"REJECTED".equals(sick.getApprovalStatus()))
                .anyMatch(sick -> {
                    LocalDate start = sick.getAttendanceDate();
                    int days = sick.getLeaveDays() == null ? 1 : sick.getLeaveDays();
                    return !date.isBefore(start) && !date.isAfter(start.plusDays(days - 1L));
                });
    }

    // [BARU] Setujui / tolak pengajuan Sakit. Hanya yang masih PENDING yang
    // bisa diputuskan, supaya keputusan tidak bolak-balik tanpa jejak.
    public AttendanceResponse decideSick(Long attendanceId, String decision, Authentication authentication) {
        String status = normalize(decision);
        if (!status.equals("APPROVED") && !status.equals("REJECTED")) {
            throw new IllegalArgumentException("Keputusan tidak valid. Gunakan APPROVED atau REJECTED.");
        }

        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Data absensi tidak ditemukan."));
        if (!"SAKIT".equals(attendance.getReason())) {
            throw new IllegalArgumentException("Hanya pengajuan Sakit yang bisa diputuskan.");
        }
        // [BARU] Cegah memutuskan sakit di luar divisi / jenjang / milik sendiri.
        if (!approvalScopeService.resolve(authentication).canHandle(attendance.getEmployee())) {
            throw new IllegalStateException("Anda tidak berwenang memproses pengajuan sakit ini.");
        }
        if (!"PENDING".equals(attendance.getApprovalStatus())) {
            throw new IllegalStateException("Pengajuan ini sudah diproses.");
        }

        attendance.setApprovalStatus(status);
        return toResponse(attendanceRepository.save(attendance));
    }

    private String resolveStatus(String action, String reason) {
        if (reason.equals("SAKIT")) return "SICK";
        if (reason.equals("IZIN")) return "IZIN";
        if (action.equals("KELUAR")) return "DONE";
        // MASUK + ABSEN -- dibandingkan ke jam server (sumber kebenaran),
        // bukan jam yang (mungkin) dikirim dari perangkat klien.
        return LocalTime.now().isAfter(ON_TIME_CUTOFF) ? "LATE" : "ON_TIME";
    }

    private Employee resolveEmployee(String username) {
        return employeeRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new IllegalStateException("Data karyawan tidak ditemukan untuk user ini"));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private AttendanceResponse toResponse(Attendance attendance) {
        return AttendanceResponse.builder()
                .attendanceId(attendance.getAttendanceId())
                .employeeId(attendance.getEmployee().getEmployeeId())
                .employeeName(attendance.getEmployee().getFullName())
                .action(attendance.getAction())
                .reason(attendance.getReason())
                .status(attendance.getStatus())
                .note(attendance.getNote())
                .photoUrl(attendance.getPhotoUrl())
                .latitude(attendance.getLatitude())
                .longitude(attendance.getLongitude())
                .mapsUrl(buildMapsUrl(attendance.getLatitude(), attendance.getLongitude()))
                .recordedAt(attendance.getRecordedAt())
                .attendanceDate(attendance.getAttendanceDate())
                .approvalStatus(attendance.getApprovalStatus())
                .locationName(attendance.getLocationName())
                .leaveDays(attendance.getLeaveDays())
                .documentUrl(attendance.getDocumentUrl())
                .documentRequired(attendance.getDocumentRequired())
                .build();
    }

    private String buildMapsUrl(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) return null; // [BARU] izin/sakit tanpa GPS
        return "https://www.google.com/maps?q=" + latitude.toPlainString() + "," + longitude.toPlainString();
    }
}
