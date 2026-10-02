package sys.hris.sims.attendance.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.dto.AttendanceResponse;
import sys.hris.sims.attendance.dto.AttendanceSubmitRequest;
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

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final CloudinaryService cloudinaryService;

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
        if (action.equals("KELUAR")
                && !attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAction(employee.getEmployeeId(), today, "MASUK")) {
            throw new IllegalStateException("Anda belum melakukan check-in hari ini.");
        }

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
                .build();

        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    // [BARU] Daftar pengajuan Sakit untuk halaman persetujuan SuperAdmin.
    public List<AttendanceResponse> getSickApprovals() {
        return attendanceRepository.findByReasonAndActionOrderByRecordedAtDesc("SAKIT", "MASUK")
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // [BARU] Setujui / tolak pengajuan Sakit. Hanya yang masih PENDING yang
    // bisa diputuskan, supaya keputusan tidak bolak-balik tanpa jejak.
    public AttendanceResponse decideSick(Long attendanceId, String decision) {
        String status = normalize(decision);
        if (!status.equals("APPROVED") && !status.equals("REJECTED")) {
            throw new IllegalArgumentException("Keputusan tidak valid. Gunakan APPROVED atau REJECTED.");
        }

        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Data absensi tidak ditemukan."));
        if (!"SAKIT".equals(attendance.getReason())) {
            throw new IllegalArgumentException("Hanya pengajuan Sakit yang bisa diputuskan.");
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
                .build();
    }

    private String buildMapsUrl(BigDecimal latitude, BigDecimal longitude) {
        return "https://www.google.com/maps?q=" + latitude.toPlainString() + "," + longitude.toPlainString();
    }
}
