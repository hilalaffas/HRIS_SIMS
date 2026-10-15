package sys.hris.sims.overtime.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.common.service.ApprovalScopeService;
import sys.hris.sims.common.service.ApprovalScopeService.ApprovalScope;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.overtime.dto.OvertimeExtensionRequest;
import sys.hris.sims.overtime.dto.OvertimeExtensionWindowResponse;
import sys.hris.sims.overtime.dto.OvertimeResponse;
import sys.hris.sims.overtime.dto.OvertimeSubmitRequest;
import sys.hris.sims.overtime.entity.OvertimeRequest;
import sys.hris.sims.overtime.repository.OvertimeRepository;

@Service
@RequiredArgsConstructor
public class OvertimeService {

    private static final int MAX_REASON_LENGTH = 500;

    // [BARU] Lembur tambahan saat check-out. Jam kerja berakhir 17:00 WIB (sama
    // dengan Shift Normal di frontend). Waktu SELALU dibaca dalam zona WIB,
    // bukan zona bawaan server, supaya "17:00" tidak bergeser di server UTC.
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Jakarta");
    private static final LocalTime WORK_END_TIME = LocalTime.of(17, 0);
    private static final List<String> ACTIVE_STATUSES = List.of("PENDING", "APPROVED");
    // Awalan alasan supaya approver/HR mengenali lembur yang bukan dari
    // pengajuan awal (pola sama dengan awalan "Pulang cepat: " di absensi).
    private static final String EXTENSION_REASON_PREFIX = "Tambahan saat check-out: ";

    private final OvertimeRepository overtimeRepository;
    private final EmployeeRepository employeeRepository;
    // [BARU] Dipakai memastikan lembur tambahan hanya bisa diajukan saat user
    // sudah check-in dan belum check-out hari ini.
    private final AttendanceRepository attendanceRepository;
    // [BARU] Aturan siapa boleh melihat / memutuskan lembur siapa.
    private final ApprovalScopeService approvalScopeService;

    public List<OvertimeResponse> getMyOvertime(String username) {
        Employee employee = resolveEmployee(username);
        return overtimeRepository
                .findByEmployee_EmployeeIdOrderByOvertimeDateDescOvertimeIdDesc(employee.getEmployeeId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // [UBAH] Pengajuan lembur untuk halaman persetujuan: SuperAdmin melihat
    // semua, Leader/SPV/Manager hanya bawahan di divisinya (lihat ApprovalScopeService).
    public List<OvertimeResponse> getAllForApproval(Authentication authentication) {
        ApprovalScope scope = approvalScopeService.resolve(authentication);
        return overtimeRepository.findAllByOrderByOvertimeDateDescOvertimeIdDesc()
                .stream()
                .filter(overtime -> scope.canHandle(overtime.getEmployee()))
                .map(this::toResponse)
                .toList();
    }

    // [BARU] Setujui / tolak lembur. Hanya yang masih PENDING yang bisa diputuskan.
    public OvertimeResponse decide(Long overtimeId, String decision, Authentication authentication) {
        String status = decision == null ? "" : decision.trim().toUpperCase(Locale.ROOT);
        if (!status.equals("APPROVED") && !status.equals("REJECTED")) {
            throw new IllegalArgumentException("Keputusan tidak valid. Gunakan APPROVED atau REJECTED.");
        }

        OvertimeRequest overtime = overtimeRepository.findById(overtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Pengajuan lembur tidak ditemukan."));
        // [BARU] Cegah memutuskan lembur di luar divisi / jenjang / milik sendiri.
        if (!approvalScopeService.resolve(authentication).canHandle(overtime.getEmployee())) {
            throw new IllegalStateException("Anda tidak berwenang memproses pengajuan lembur ini.");
        }
        if (!"PENDING".equals(overtime.getStatus())) {
            throw new IllegalStateException("Pengajuan ini sudah diproses.");
        }

        overtime.setStatus(status);
        return toResponse(overtimeRepository.save(overtime));
    }

    public OvertimeResponse submit(String username, OvertimeSubmitRequest request) {
        Employee employee = resolveEmployee(username);

        if (request.getOvertimeDate() == null) {
            throw new IllegalArgumentException("Tanggal lembur wajib diisi.");
        }
        if (request.getOvertimeDate().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Tanggal lembur tidak boleh melebihi hari ini.");
        }
        if (request.getStartTime() == null || request.getEndTime() == null) {
            throw new IllegalArgumentException("Jam mulai dan jam selesai wajib diisi.");
        }
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("Jam selesai harus lebih besar dari jam mulai.");
        }

        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Alasan / pekerjaan lembur wajib diisi.");
        }
        if (reason.length() > MAX_REASON_LENGTH) {
            throw new IllegalArgumentException("Alasan lembur maksimal " + MAX_REASON_LENGTH + " karakter.");
        }

        if (overtimeRepository.existsByEmployee_EmployeeIdAndOvertimeDateAndStatusIn(
                employee.getEmployeeId(), request.getOvertimeDate(), List.of("PENDING", "APPROVED"))) {
            throw new IllegalArgumentException("Pengajuan lembur pada tanggal ini sudah ada.");
        }

        int totalMinutes = (int) Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();

        OvertimeRequest saved = overtimeRepository.save(OvertimeRequest.builder()
                .employee(employee)
                .overtimeDate(request.getOvertimeDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .totalMinutes(totalMinutes)
                .reason(reason)
                .status("PENDING")
                .build());

        return toResponse(saved);
    }

    // [BARU] Jendela lembur tambahan hari ini -- dibaca frontend saat popup
    // check-out (setelah 17:00) untuk tahu jam mulai, batas jam selesai, dan
    // lembur apa saja yang sudah tercatat hari ini.
    public OvertimeExtensionWindowResponse getExtensionWindow(String username) {
        Employee employee = resolveEmployee(username);
        return buildExtensionWindow(employee, ZonedDateTime.now(APP_ZONE));
    }

    // [BARU] "Tambah Lembur" saat check-out: lembur susulan yang TIDAK sesuai
    // pengajuan awal (mis. rencana 17:00-19:00, lupa check-out jam 19:00 dan
    // ternyata lembur 1 jam lagi). Jam mulai otomatis = akhir lembur terakhir,
    // jadi bisa dipanggil berulang (19-20, lalu 20-21, dst) tanpa celah/tumpang
    // tindih. Statusnya PENDING dan masuk antrean persetujuan seperti biasa.
    @Transactional
    public OvertimeResponse submitExtension(String username, OvertimeExtensionRequest request) {
        Employee employee = resolveEmployee(username);
        Long employeeId = employee.getEmployeeId();
        ZonedDateTime now = ZonedDateTime.now(APP_ZONE);
        LocalDate today = now.toLocalDate();

        // Hanya sah selama user sedang bekerja: sudah check-in, belum check-out,
        // dan bukan hari Sakit/Izin. Setelah check-out, pakai menu Pengajuan Lembur.
        if (!attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAction(employeeId, today, "MASUK")) {
            throw new IllegalStateException("Anda belum melakukan check-in hari ini.");
        }
        if (attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndActionAndReasonIn(
                employeeId, today, "MASUK", List.of("SAKIT", "IZIN"))) {
            throw new IllegalStateException("Anda tercatat Sakit/Izin hari ini, lembur tidak dapat diajukan.");
        }
        if (attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAction(employeeId, today, "KELUAR")) {
            throw new IllegalStateException(
                    "Anda sudah check-out hari ini. Ajukan lembur melalui menu Pengajuan Lembur.");
        }

        if (request == null || request.getEndTime() == null) {
            throw new IllegalArgumentException("Jam selesai wajib diisi.");
        }

        // Jam mulai & batas atas dihitung SERVER (bukan dari klien).
        OvertimeExtensionWindowResponse window = buildExtensionWindow(employee, now);
        LocalTime start = window.getStartTime();
        LocalTime end = request.getEndTime().truncatedTo(ChronoUnit.MINUTES);

        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("Jam selesai harus lebih besar dari jam mulai (" + start + ").");
        }
        if (end.isAfter(window.getMaxEndTime())) {
            throw new IllegalArgumentException(
                    "Jam selesai tidak boleh melebihi jam sekarang (" + window.getMaxEndTime() + ").");
        }

        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Alasan / pekerjaan lembur wajib diisi.");
        }
        int maxReasonLength = MAX_REASON_LENGTH - EXTENSION_REASON_PREFIX.length();
        if (reason.length() > maxReasonLength) {
            throw new IllegalArgumentException("Alasan lembur maksimal " + maxReasonLength + " karakter.");
        }

        OvertimeRequest saved = overtimeRepository.save(OvertimeRequest.builder()
                .employee(employee)
                .overtimeDate(today)
                .startTime(start)
                .endTime(end)
                .totalMinutes((int) Duration.between(start, end).toMinutes())
                .reason(EXTENSION_REASON_PREFIX + reason)
                .status("PENDING")
                .build());

        return toResponse(saved);
    }

    private OvertimeExtensionWindowResponse buildExtensionWindow(Employee employee, ZonedDateTime now) {
        LocalDate today = now.toLocalDate();
        List<OvertimeRequest> active = overtimeRepository
                .findByEmployee_EmployeeIdAndOvertimeDateAndStatusInOrderByStartTimeAscOvertimeIdAsc(
                        employee.getEmployeeId(), today, ACTIVE_STATUSES);

        // Mulai dari jam pulang, lalu geser ke akhir lembur aktif yang paling akhir.
        LocalTime start = WORK_END_TIME;
        for (OvertimeRequest overtime : active) {
            if (overtime.getEndTime().isAfter(start)) {
                start = overtime.getEndTime();
            }
        }
        // Lembur susulan = pekerjaan yang SUDAH terjadi, jadi paling jauh sampai menit ini.
        LocalTime maxEnd = now.toLocalTime().truncatedTo(ChronoUnit.MINUTES);

        return OvertimeExtensionWindowResponse.builder()
                .overtimeDate(today)
                .workEndTime(WORK_END_TIME)
                .startTime(start)
                .maxEndTime(maxEnd)
                .canExtend(maxEnd.isAfter(start))
                .entries(active.stream().map(this::toResponse).toList())
                .build();
    }

    private Employee resolveEmployee(String username) {
        return employeeRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new IllegalStateException("Data karyawan tidak ditemukan untuk user ini"));
    }

    private OvertimeResponse toResponse(OvertimeRequest overtime) {
        return OvertimeResponse.builder()
                .overtimeId(overtime.getOvertimeId())
                .employeeId(overtime.getEmployee().getEmployeeId())
                .employeeName(overtime.getEmployee().getFullName())
                .overtimeDate(overtime.getOvertimeDate())
                .startTime(overtime.getStartTime())
                .endTime(overtime.getEndTime())
                .totalMinutes(overtime.getTotalMinutes())
                .reason(overtime.getReason())
                .status(overtime.getStatus())
                .createdAt(overtime.getCreatedAt())
                .build();
    }
}
