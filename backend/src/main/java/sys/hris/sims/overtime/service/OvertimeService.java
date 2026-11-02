package sys.hris.sims.overtime.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Locale;
import java.util.ArrayList;

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
import sys.hris.sims.overtime.entity.OvertimeApproval;
import sys.hris.sims.overtime.repository.OvertimeApprovalRepository;
import sys.hris.sims.overtime.repository.OvertimeRepository;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;

@Service
@RequiredArgsConstructor
public class OvertimeService {

    private static final int MAX_REASON_LENGTH = 500;

    // Jam kerja reguler berakhir 17:00 WIB; divisi shift memakai jam akhir
    // jadwal karyawan yang dipublikasikan.
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Jakarta");
    private static final LocalTime WORK_END_TIME = LocalTime.of(17, 0);
    private static final List<String> ACTIVE_STATUSES = List.of("PENDING", "APPROVED");
    // Awalan alasan supaya approver/HR mengenali lembur yang bukan dari
    // pengajuan awal (pola sama dengan awalan "Pulang cepat: " di absensi).
    private static final String EXTENSION_REASON_PREFIX = "Tambahan saat check-out: ";

    private final OvertimeRepository overtimeRepository;
    private final OvertimeApprovalRepository approvalRepository;
    private final EmployeeRepository employeeRepository;
    // [BARU] Dipakai memastikan lembur tambahan hanya bisa diajukan saat user
    // sudah check-in dan belum check-out hari ini.
    private final AttendanceRepository attendanceRepository;
    // [BARU] Aturan siapa boleh melihat / memutuskan lembur siapa.
    private final ApprovalScopeService approvalScopeService;
    private final WorkScheduleRepository workScheduleRepository;

    public List<OvertimeResponse> getMyOvertime(String username) {
        Employee employee = resolveEmployee(username);
        return overtimeRepository
                .findByEmployee_EmployeeIdOrderByOvertimeDateDescOvertimeIdDesc(employee.getEmployeeId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // [UBAH] Super Admin / DEV tetap melihat semua pengajuan (hanya lihat, tidak bisa
    // memutuskan). Leader/SPV/Manager hanya melihat pengajuan yang menugaskan mereka
    // sebagai approver. Akun DEV (supersecret) tidak punya profil karyawan, jadi
    // tidak boleh memanggil resolveEmployee() di jalur Super Admin.
    public List<OvertimeResponse> getAllForApproval(Authentication authentication) {
        ApprovalScope scope = approvalScopeService.resolve(authentication);
        Long actorId = scope.all() ? null : scope.approverId();

        return overtimeRepository.findAllByOrderByOvertimeDateDescOvertimeIdDesc().stream()
                .map(this::toResponse)
                .filter(response -> scope.all() || isAssignedApprover(response, actorId))
                .map(response -> {
                    boolean isMyTurn = !scope.all()
                            && actorId.equals(response.getCurrentApproverEmployeeId())
                            && "PENDING".equals(response.getStatus());
                    response.setCanAct(isMyTurn);
                    return response;
                })
                .toList();
    }

    private boolean isAssignedApprover(OvertimeResponse response, Long actorId) {
        return response.getApprovals().stream()
                .anyMatch(step -> actorId.equals(step.getEmployeeId()));
    }

    @Transactional
    public OvertimeResponse decide(Long overtimeId, String decision, Authentication authentication) {
        String status = decision == null ? "" : decision.trim().toUpperCase(Locale.ROOT);
        if (!status.equals("APPROVED") && !status.equals("REJECTED"))
            throw new IllegalArgumentException("Keputusan tidak valid. Gunakan APPROVED atau REJECTED.");
        Employee actor = resolveEmployee(authentication.getName());
        List<OvertimeApproval> steps = approvalRepository.findByOvertime_OvertimeIdOrderByApprovalIdAsc(overtimeId);
        if (steps.isEmpty()) throw new IllegalStateException("Nama approval belum dilengkapi. Pemohon harus mengedit pengajuan terlebih dahulu.");
        OvertimeApproval mine = steps.stream().filter(a -> a.getApproverEmployee().getEmployeeId().equals(actor.getEmployeeId()))
                .findFirst().orElseThrow(() -> new IllegalStateException("Anda bukan approver pengajuan ini."));
        if (!"PENDING".equals(mine.getAction())) throw new IllegalStateException("Tahap persetujuan ini sudah diproses.");
        int mineIndex = steps.indexOf(mine);
        if (steps.subList(0, mineIndex).stream().anyMatch(a -> !"APPROVED".equals(a.getAction())))
            throw new IllegalStateException("Menunggu persetujuan tahap sebelumnya.");
        mine.setAction(status);
        mine.setActedAt(java.time.LocalDateTime.now());
        OvertimeRequest overtime = mine.getOvertime();
        if ("REJECTED".equals(status)) overtime.setStatus("REJECTED");
        else if (steps.stream().allMatch(a -> "APPROVED".equals(a.getAction()))) overtime.setStatus("APPROVED");
        approvalRepository.save(mine);
        overtimeRepository.save(overtime);
        return toResponse(overtime);
    }

    private String normalizeRole(Employee employee) {
        String role = employee.getUser().getRoleId().getRoleName().toUpperCase(Locale.ROOT);
        if (role.contains("LEADER")) return "LEADER";
        if (role.contains("SPV") || role.contains("SUPERVISOR")) return "SPV";
        if (role.contains("MANAGER")) return "MANAGER";
        return role;
    }

    private Employee selectedApprover(Long id, String expected, Employee requester) {
        if (id == null) throw new IllegalArgumentException("Approver " + expected + " wajib dipilih.");
        Employee approver = employeeRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Approver tidak ditemukan."));
        if (!expected.equals(normalizeRole(approver))) throw new IllegalArgumentException("Approver harus memiliki role " + expected + ".");
        if (!Boolean.TRUE.equals(approver.getIsActive())) throw new IllegalArgumentException("Approver sudah tidak aktif.");
        if (requester.getDivisi() == null || approver.getDivisi() == null
                || !requester.getDivisi().getId().equals(approver.getDivisi().getId()))
            throw new IllegalArgumentException("Approver harus berasal dari divisi yang sama.");
        return approver;
    }

    private void createApprovalSteps(OvertimeRequest overtime, Employee requester, OvertimeSubmitRequest request) {
        List<OvertimeApproval> steps = new ArrayList<>();
        String requesterRole = normalizeRole(requester);
        if ("LEADER".equals(requesterRole)) {
            // Leader adalah tahap pertama yang sudah dilewati oleh pemohon;
            // approval dimulai dari SPV lalu Manager.
            steps.add(OvertimeApproval.builder().overtime(overtime).approverRole("SPV").approverEmployee(selectedApprover(request.getSpvEmployeeId(), "SPV", requester)).action("PENDING").build());
            steps.add(OvertimeApproval.builder().overtime(overtime).approverRole("MANAGER").approverEmployee(selectedApprover(request.getManagerEmployeeId(), "MANAGER", requester)).action("PENDING").build());
        } else if ("SPV".equals(requesterRole)) {
            // SPV melewati tahap Leader dan SPV; berikutnya Manager.
            steps.add(OvertimeApproval.builder().overtime(overtime).approverRole("MANAGER").approverEmployee(selectedApprover(request.getManagerEmployeeId(), "MANAGER", requester)).action("PENDING").build());
        } else if ("MANAGER".equals(requesterRole)) {
            // Pertahankan mekanisme lama untuk Manager: approval Manager lain.
            Employee manager = selectedApprover(request.getManagerEmployeeId(), "MANAGER", requester);
            if (manager.getEmployeeId().equals(requester.getEmployeeId())) throw new IllegalArgumentException("Manager tidak boleh menyetujui lembur sendiri.");
            steps.add(OvertimeApproval.builder().overtime(overtime).approverRole("MANAGER").approverEmployee(manager).action("PENDING").build());
        } else {
            steps.add(OvertimeApproval.builder().overtime(overtime).approverRole("LEADER").approverEmployee(selectedApprover(request.getLeaderEmployeeId(), "LEADER", requester)).action("PENDING").build());
            steps.add(OvertimeApproval.builder().overtime(overtime).approverRole("SPV").approverEmployee(selectedApprover(request.getSpvEmployeeId(), "SPV", requester)).action("PENDING").build());
            steps.add(OvertimeApproval.builder().overtime(overtime).approverRole("MANAGER").approverEmployee(selectedApprover(request.getManagerEmployeeId(), "MANAGER", requester)).action("PENDING").build());
        }
        approvalRepository.saveAll(steps);
    }

    @Transactional
    public OvertimeResponse updateApprovers(Long overtimeId, OvertimeSubmitRequest request, String username) {
        Employee requester = resolveEmployee(username);
        OvertimeRequest overtime = overtimeRepository.findById(overtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Pengajuan lembur tidak ditemukan."));
        if (!overtime.getEmployee().getEmployeeId().equals(requester.getEmployeeId()))
            throw new IllegalStateException("Anda tidak memiliki akses ke pengajuan ini.");
        if (!"PENDING".equals(overtime.getStatus()))
            throw new IllegalStateException("Nama approval hanya dapat dilengkapi untuk pengajuan yang masih menunggu.");
        if (!approvalRepository.findByOvertime_OvertimeIdOrderByApprovalIdAsc(overtimeId).isEmpty())
            throw new IllegalStateException("Nama approval pengajuan ini sudah tersedia.");
        createApprovalSteps(overtime, requester, request);
        return toResponse(overtime);
    }

    @Transactional
    public OvertimeResponse submit(String username, OvertimeSubmitRequest request) {
        Employee employee = resolveEmployee(username);

        if (request.getOvertimeDate() == null) {
            throw new IllegalArgumentException("Tanggal lembur wajib diisi.");
        }
        if (request.getOvertimeDate().isAfter(LocalDate.now(APP_ZONE))) {
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
        validateShiftOvertime(employee, request.getOvertimeDate(), totalMinutes);

        OvertimeRequest saved = overtimeRepository.save(OvertimeRequest.builder()
                .employee(employee)
                .overtimeDate(request.getOvertimeDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .totalMinutes(totalMinutes)
                .reason(reason)
                .status("PENDING")
                .build());
        createApprovalSteps(saved, employee, request);

        return toResponse(saved);
    }

    // [BARU] Jendela lembur tambahan hari ini -- dibaca frontend saat popup
    // check-out (setelah 17:00) untuk tahu jam mulai, batas jam selesai, dan
    // lembur apa saja yang sudah tercatat hari ini.
    public OvertimeExtensionWindowResponse getExtensionWindow(String username) {
        Employee employee = resolveEmployee(username);
        ZonedDateTime now = ZonedDateTime.now(APP_ZONE);
        return buildExtensionWindow(employee, now, resolveScheduleContext(employee, now));
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
        ScheduleContext context = resolveScheduleContext(employee, now);
        LocalDate workDate = context.workDate();

        // Hanya sah selama user sedang bekerja: sudah check-in, belum check-out,
        // dan bukan hari Sakit/Izin. Setelah check-out, pakai menu Pengajuan Lembur.
        if (!attendanceRepository.existsActiveByAction(employeeId, workDate, "MASUK")) { // sakit ditolak diabaikan
            throw new IllegalStateException("Anda belum melakukan check-in hari ini.");
        }
        if (attendanceRepository.existsActiveByActionAndReasonIn(
                employeeId, workDate, "MASUK", List.of("SAKIT", "IZIN"))) {
            throw new IllegalStateException("Anda tercatat Sakit/Izin hari ini, lembur tidak dapat diajukan.");
        }
        if (attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAction(employeeId, workDate, "KELUAR")) {
            throw new IllegalStateException(
                    "Anda sudah check-out hari ini. Ajukan lembur melalui menu Pengajuan Lembur.");
        }

        if (request == null || request.getEndTime() == null) {
            throw new IllegalArgumentException("Jam selesai wajib diisi.");
        }

        // Jam mulai & batas atas dihitung SERVER (bukan dari klien).
        OvertimeExtensionWindowResponse window = buildExtensionWindow(employee, now, context);
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

        int requestedMinutes = (int) Duration.between(start, end).toMinutes();
        validateShiftOvertime(employee, workDate, requestedMinutes);

        OvertimeRequest saved = overtimeRepository.save(OvertimeRequest.builder()
                .employee(employee)
                .overtimeDate(workDate)
                .startTime(start)
                .endTime(end)
                .totalMinutes(requestedMinutes)
                .reason(EXTENSION_REASON_PREFIX + reason)
                .status("PENDING")
                .build());
        List<OvertimeApproval> previousSteps = overtimeRepository
                .findByEmployee_EmployeeIdOrderByOvertimeDateDescOvertimeIdDesc(employeeId).stream()
                .filter(item -> !item.getOvertimeId().equals(saved.getOvertimeId()))
                .map(item -> approvalRepository.findByOvertime_OvertimeIdOrderByApprovalIdAsc(item.getOvertimeId()))
                .filter(items -> !items.isEmpty()).findFirst().orElse(List.of());
        if (!previousSteps.isEmpty()) {
            approvalRepository.saveAll(previousSteps.stream().map(a -> OvertimeApproval.builder()
                    .overtime(saved).approverRole(a.getApproverRole()).approverEmployee(a.getApproverEmployee())
                    .action("PENDING").build()).toList());
        }

        return toResponse(saved);
    }

    private OvertimeExtensionWindowResponse buildExtensionWindow(Employee employee, ZonedDateTime now, ScheduleContext context) {
        LocalDate workDate = context.workDate();
        List<OvertimeRequest> active = overtimeRepository
                .findByEmployee_EmployeeIdAndOvertimeDateAndStatusInOrderByStartTimeAscOvertimeIdAsc(
                        employee.getEmployeeId(), workDate, ACTIVE_STATUSES);

        // Mulai dari jam pulang, lalu geser ke akhir lembur aktif yang paling akhir.
        LocalTime workEnd = context.schedule() != null && context.schedule().getShift() != null
                ? context.schedule().getShift().getEndTime() : WORK_END_TIME;
        LocalTime start = workEnd;
        for (OvertimeRequest overtime : active) {
            if (overtime.getEndTime().isAfter(start)) {
                start = overtime.getEndTime();
            }
        }
        // Lembur susulan = pekerjaan yang SUDAH terjadi, jadi paling jauh sampai menit ini.
        LocalTime maxEnd = now.toLocalTime().truncatedTo(ChronoUnit.MINUTES);

        boolean afterWorkEnd = hasPassedWorkEnd(context, now);
        return OvertimeExtensionWindowResponse.builder()
                .overtimeDate(workDate)
                .workEndTime(workEnd)
                .startTime(start)
                .maxEndTime(maxEnd)
                .canExtend(afterWorkEnd && maxEnd.isAfter(start))
                .entries(active.stream().map(this::toResponse).toList())
                .build();
    }

    private ScheduleContext resolveScheduleContext(Employee employee, ZonedDateTime now) {
        LocalDate today = now.toLocalDate();
        WorkSchedule todaySchedule = findSchedule(employee.getEmployeeId(), today);
        LocalDate previousDate = today.minusDays(1);
        WorkSchedule previousSchedule = findSchedule(employee.getEmployeeId(), previousDate);
        boolean continuingOvernight = previousSchedule != null && previousSchedule.getShift() != null
                && previousSchedule.getShift().getEndTime().isBefore(previousSchedule.getShift().getStartTime())
                && now.toLocalDateTime().isBefore(LocalDateTime.of(today, previousSchedule.getShift().getEndTime()))
                && attendanceRepository.existsActiveByAction(employee.getEmployeeId(), previousDate, "MASUK");
        return continuingOvernight
                ? new ScheduleContext(previousDate, previousSchedule)
                : new ScheduleContext(today, todaySchedule);
    }

    private boolean hasPassedWorkEnd(ScheduleContext context, ZonedDateTime now) {
        LocalTime end = context.schedule() != null && context.schedule().getShift() != null
                ? context.schedule().getShift().getEndTime() : WORK_END_TIME;
        LocalDate endDate = context.workDate();
        if (context.schedule() != null && context.schedule().getShift() != null
                && end.isBefore(context.schedule().getShift().getStartTime())) {
            endDate = endDate.plusDays(1);
        }
        return !now.toLocalDateTime().isBefore(LocalDateTime.of(endDate, end));
    }

    private WorkSchedule findSchedule(Long employeeId, LocalDate date) {
        return workScheduleRepository.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
                        employeeId, date, date)
                .stream().findFirst().orElse(null);
    }

    private void validateShiftOvertime(Employee employee, LocalDate date, int requestedMinutes) {
        if (employee.getDivisi() == null
                || !"SHIFTING".equalsIgnoreCase(employee.getDivisi().getTipeDivisi())) {
            return;
        }
        if (requestedMinutes <= 0 || requestedMinutes > 4 * 60) {
            throw new IllegalArgumentException("Lembur karyawan shift maksimal 4 jam per hari.");
        }

        LocalDate weekStart = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        List<OvertimeRequest> active = overtimeRepository.findByEmployee_EmployeeIdAndOvertimeDateBetweenAndStatusIn(
                employee.getEmployeeId(), weekStart, weekEnd, ACTIVE_STATUSES);
        int dailyMinutes = active.stream()
                .filter(item -> date.equals(item.getOvertimeDate()))
                .mapToInt(OvertimeRequest::getTotalMinutes)
                .sum();
        int weeklyMinutes = active.stream().mapToInt(OvertimeRequest::getTotalMinutes).sum();
        if (dailyMinutes + requestedMinutes > 4 * 60) {
            throw new IllegalArgumentException("Total lembur karyawan shift tidak boleh melebihi 4 jam per hari.");
        }
        if (weeklyMinutes + requestedMinutes > 18 * 60) {
            throw new IllegalArgumentException("Total lembur karyawan shift tidak boleh melebihi 18 jam per minggu.");
        }
    }

    private record ScheduleContext(LocalDate workDate, WorkSchedule schedule) { }

    private Employee resolveEmployee(String username) {
        return employeeRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new IllegalStateException("Data karyawan tidak ditemukan untuk user ini"));
    }

    private OvertimeResponse toResponse(OvertimeRequest overtime) {
        List<OvertimeApproval> steps = approvalRepository
                .findByOvertime_OvertimeIdOrderByApprovalIdAsc(overtime.getOvertimeId());
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
                .approvals(steps.stream()
                        .map(a -> new OvertimeResponse.OvertimeApprovalStep(a.getApproverRole(), a.getApproverEmployee().getEmployeeId(),
                                a.getApproverEmployee().getFullName(), a.getAction(), a.getActedAt(), a.getNote())).toList())
                .currentApproverEmployeeId(steps.stream()
                        .filter(a -> "PENDING".equals(a.getAction())).map(a -> a.getApproverEmployee().getEmployeeId()).findFirst().orElse(null))
                .build();
    }
}
