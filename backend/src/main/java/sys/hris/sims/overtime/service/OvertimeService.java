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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.common.service.ApprovalChainPolicy;
import sys.hris.sims.common.service.ApprovalScopeService;
import sys.hris.sims.common.service.ApprovalScopeService.ApprovalScope;
import sys.hris.sims.common.service.HrdApproverPolicy;
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
import sys.hris.sims.schedule.workhours.WorkHours;
import sys.hris.sims.schedule.workhours.WorkHoursResolver;

@Service
@RequiredArgsConstructor
public class OvertimeService {

    private static final int MAX_REASON_LENGTH = 500;
    // [BARU] Alasan penolakan wajib diisi (sama dengan batas di popup ActionReasonModal frontend).
    private static final int MIN_REJECT_NOTE_LENGTH = 5;

    // [UBAH] Jam pulang TIDAK lagi konstanta 17:00: diambil dari WorkHoursResolver (jam dasar divisi
    // Regular, jadwal khusus hari itu, atau shift karyawan), jadi lembur dihitung dari jam pulang yang benar.
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Jakarta");
    // [BARU] Status pengajuan & tindakan per tahap (dulu berupa string literal tersebar).
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_REJECTED = "REJECTED";
    private static final int ID_BATCH_SIZE = 500; // batas isi klausa IN per query
    private static final List<String> ACTIVE_STATUSES = List.of(STATUS_PENDING, STATUS_APPROVED);
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
    private final HrdApproverPolicy hrdApproverPolicy; // [BARU] aturan approver HRD
    private final ApprovalChainPolicy approvalChainPolicy; // [BARU] jenjang approval per jabatan pemohon

    // [UBAH] Semua tahap dimuat sekali (batch), bukan 1 query per pengajuan.
    public List<OvertimeResponse> getMyOvertime(String username) {
        Employee employee = resolveEmployee(username);
        return toResponses(overtimeRepository
                .findByEmployee_EmployeeIdOrderByOvertimeDateDescOvertimeIdDesc(employee.getEmployeeId()));
    }

    // [UBAH] Super Admin / DEV tetap melihat semua pengajuan (hanya lihat, tidak bisa
    // memutuskan). HRD / Leader / SPV / Manager hanya melihat pengajuan yang menugaskan mereka
    // sebagai approver. Akun DEV (sys_dev) tidak punya profil karyawan, jadi
    // tidak boleh memanggil resolveEmployee() di jalur Super Admin.
    // [UBAH] Pengajuan milik approver diambil langsung dari tabel tahap (tidak lagi memuat SEMUA pengajuan
    // lalu menyaring di memori). canAct hanya true untuk approver yang gilirannya SEKARANG.
    public List<OvertimeResponse> getAllForApproval(Authentication authentication) {
        ApprovalScope scope = approvalScopeService.resolve(authentication);
        if (scope.all()) {
            return toResponses(overtimeRepository.findAllByOrderByOvertimeDateDescOvertimeIdDesc());
        }

        Long actorId = scope.approverId();
        List<Long> assignedIds = approvalRepository.findOvertimeIdsByApproverEmployeeId(actorId);
        if (assignedIds.isEmpty()) {
            return List.of();
        }
        List<OvertimeRequest> requests = new ArrayList<>();
        for (int from = 0; from < assignedIds.size(); from += ID_BATCH_SIZE) {
            List<Long> batch = assignedIds.subList(from, Math.min(from + ID_BATCH_SIZE, assignedIds.size()));
            requests.addAll(overtimeRepository.findAllByOvertimeIdInOrderByOvertimeDateDescOvertimeIdDesc(batch));
        }
        requests.sort(Comparator.comparing(OvertimeRequest::getOvertimeDate).reversed()
                .thenComparing(Comparator.comparing(OvertimeRequest::getOvertimeId).reversed()));

        List<OvertimeResponse> responses = toResponses(requests);
        responses.forEach(response -> response.setCanAct(
                actorId.equals(response.getCurrentApproverEmployeeId()) && STATUS_PENDING.equals(response.getStatus())));
        return responses;
    }

    // [UBAH] Proses review (setujui / tolak) disamakan dengan alur Cuti:
    //  - hanya pengajuan berstatus PENDING yang bisa diproses (dulu tidak dicek);
    //  - role approver harus sama dengan tahap yang ditugaskan (Leader -> tahap LEADER, HRD -> tahap HRD, dst.);
    //  - giliran dicek berdasarkan URUTAN TAHAP (Leader -> SPV -> Manager), bukan urutan insert baris;
    //  - catatan disimpan pada tahap yang diproses (opsional saat setuju, WAJIB saat tolak);
    //  - satu penolakan langsung mengakhiri pengajuan.
    @Transactional
    public OvertimeResponse decide(Long overtimeId, String decision, String note, Authentication authentication) {
        String status = decision == null ? "" : decision.trim().toUpperCase(Locale.ROOT);
        if (!status.equals(STATUS_APPROVED) && !status.equals(STATUS_REJECTED))
            throw new IllegalArgumentException("Keputusan tidak valid. Gunakan APPROVED atau REJECTED.");
        String cleanNote = note == null ? "" : note.trim();
        if (cleanNote.length() > MAX_REASON_LENGTH)
            throw new IllegalArgumentException("Catatan maksimal " + MAX_REASON_LENGTH + " karakter.");
        // [BARU] Menolak lembur WAJIB disertai alasan. Dicek di server juga, bukan hanya di popup frontend.
        if (status.equals(STATUS_REJECTED) && cleanNote.length() < MIN_REJECT_NOTE_LENGTH)
            throw new IllegalArgumentException("Alasan penolakan wajib diisi (minimal " + MIN_REJECT_NOTE_LENGTH + " karakter).");

        Employee actor = resolveEmployee(authentication.getName());
        OvertimeRequest overtime = overtimeRepository.findById(overtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Pengajuan lembur tidak ditemukan."));
        // [BARU] Pemohon tidak boleh memproses lemburnya sendiri.
        hrdApproverPolicy.assertNotOwnRequest(actor, overtime.getEmployee());
        if (!STATUS_PENDING.equals(overtime.getStatus()))
            throw new IllegalStateException("Pengajuan lembur ini sudah tidak dalam status menunggu persetujuan.");

        List<OvertimeApproval> steps = loadSortedSteps(overtimeId);
        if (steps.isEmpty()) throw new IllegalStateException("Nama approval belum dilengkapi. Pemohon harus mengedit pengajuan terlebih dahulu.");

        Long actorId = actor.getEmployeeId();
        OvertimeApproval mine = steps.stream()
                .filter(step -> actorId.equals(step.getApproverEmployee().getEmployeeId()))
                .filter(step -> STATUS_PENDING.equals(step.getAction()))
                .findFirst()
                .orElseThrow(() -> steps.stream().anyMatch(step -> actorId.equals(step.getApproverEmployee().getEmployeeId()))
                        ? new IllegalStateException("Tahap persetujuan ini sudah diproses.")
                        : new IllegalStateException("Anda bukan approver pengajuan ini."));
        if (!mine.getApproverRole().equalsIgnoreCase(ApprovalChainPolicy.stageOf(actor)))
            throw new IllegalStateException("Role Anda tidak sesuai dengan tahap persetujuan yang ditugaskan.");

        int mineIndex = steps.indexOf(mine);
        steps.subList(0, mineIndex).stream()
                .filter(step -> !STATUS_APPROVED.equals(step.getAction()))
                .findFirst()
                .ifPresent(step -> { throw new IllegalStateException(
                        "Persetujuan harus berurutan. Menunggu persetujuan " + step.getApproverRole() + " terlebih dahulu."); });

        mine.setAction(status);
        mine.setNote(cleanNote.isEmpty() ? null : cleanNote);
        mine.setActedAt(LocalDateTime.now());
        if (STATUS_REJECTED.equals(status)) {
            overtime.setStatus(STATUS_REJECTED);
        } else if (steps.stream().allMatch(step -> STATUS_APPROVED.equals(step.getAction()))) {
            overtime.setStatus(STATUS_APPROVED);
        }
        approvalRepository.save(mine);
        overtimeRepository.save(overtime);
        return toResponse(overtime, steps);
    }

    // [UBAH] Jenjang approval mengikuti jabatan pemohon (ApprovalChainPolicy):
    //   HRD -> HRD | Member -> Leader, SPV, Manager | Leader -> SPV, Manager | SPV -> Manager | Manager -> Manager lain.
    // Server memvalidasi SEMUA pilihan (role, aktif, satu divisi, bukan diri sendiri); id untuk tahap
    // yang tidak diperlukan pemohon diabaikan.
    private void createApprovalSteps(OvertimeRequest overtime, Employee requester, OvertimeSubmitRequest request) {
        Map<String, Employee> approvers = approvalChainPolicy.resolveApprovers(
                requester, stage -> selectedApproverId(request, stage));
        saveApprovalSteps(overtime, approvers);
    }

    private void saveApprovalSteps(OvertimeRequest overtime, Map<String, Employee> approversByStage) {
        // LinkedHashMap berurutan sesuai tahap, jadi approval_id naik mengikuti urutan giliran.
        approvalRepository.saveAll(approversByStage.entrySet().stream()
                .map(entry -> OvertimeApproval.builder()
                        .overtime(overtime)
                        .approverRole(entry.getKey())
                        .approverEmployee(entry.getValue())
                        .action(STATUS_PENDING)
                        .build())
                .toList());
    }

    private static Long selectedApproverId(OvertimeSubmitRequest request, String stage) {
        return switch (stage) {
            case ApprovalChainPolicy.STAGE_LEADER -> request.getLeaderEmployeeId();
            case ApprovalChainPolicy.STAGE_SPV -> request.getSpvEmployeeId();
            case ApprovalChainPolicy.STAGE_MANAGER -> request.getManagerEmployeeId();
            default -> request.getHrdEmployeeId();
        };
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
        // [UBAH] Approver disalin dari pengajuan sebelumnya HANYA bila rantainya masih sah untuk jabatan
        // pemohon sekarang (tahap sama persis, approver aktif, satu divisi, bukan diri sendiri). Jika tidak,
        // pemohon melengkapi nama approver lewat "Lengkapi Nama Approval".
        Map<String, Employee> reusableChain = findReusableChain(employee, saved.getOvertimeId());
        if (!reusableChain.isEmpty()) {
            saveApprovalSteps(saved, reusableChain);
        }

        return toResponse(saved);
    }

    // [BARU] Cari rantai approver dari (maks.) 10 pengajuan terakhir yang masih valid untuk pemohon.
    private Map<String, Employee> findReusableChain(Employee requester, Long currentOvertimeId) {
        List<String> requiredStages = ApprovalChainPolicy.requiredStages(requester);
        return overtimeRepository.findByEmployee_EmployeeIdOrderByOvertimeDateDescOvertimeIdDesc(requester.getEmployeeId())
                .stream()
                .filter(item -> !item.getOvertimeId().equals(currentOvertimeId))
                .limit(10)
                .map(item -> loadSortedSteps(item.getOvertimeId()))
                .filter(steps -> steps.size() == requiredStages.size())
                .map(steps -> revalidateChain(requester, requiredStages, steps))
                .filter(chain -> !chain.isEmpty())
                .findFirst()
                .orElse(Map.of());
    }

    private Map<String, Employee> revalidateChain(Employee requester, List<String> requiredStages, List<OvertimeApproval> steps) {
        Map<String, Long> approverIdByStage = new HashMap<>();
        for (OvertimeApproval step : steps) {
            approverIdByStage.put(step.getApproverRole().toUpperCase(Locale.ROOT), step.getApproverEmployee().getEmployeeId());
        }
        if (!approverIdByStage.keySet().equals(new java.util.HashSet<>(requiredStages))) {
            return Map.of();
        }
        try {
            return approvalChainPolicy.resolveApprovers(requester, approverIdByStage::get);
        } catch (IllegalArgumentException invalidChain) {
            return Map.of();
        }
    }

    private OvertimeExtensionWindowResponse buildExtensionWindow(Employee employee, ZonedDateTime now, ScheduleContext context) {
        LocalDate workDate = context.workDate();
        List<OvertimeRequest> active = overtimeRepository
                .findByEmployee_EmployeeIdAndOvertimeDateAndStatusInOrderByStartTimeAscOvertimeIdAsc(
                        employee.getEmployeeId(), workDate, ACTIVE_STATUSES);

        // Mulai dari jam pulang, lalu geser ke akhir lembur aktif yang paling akhir.
        LocalTime workEnd = WorkHoursResolver.resolve(employee, workDate, context.schedule()).end(); // [UBAH]
        LocalTime start = workEnd;
        for (OvertimeRequest overtime : active) {
            if (overtime.getEndTime().isAfter(start)) {
                start = overtime.getEndTime();
            }
        }
        // Lembur susulan = pekerjaan yang SUDAH terjadi, jadi paling jauh sampai menit ini.
        LocalTime maxEnd = now.toLocalTime().truncatedTo(ChronoUnit.MINUTES);

        boolean afterWorkEnd = hasPassedWorkEnd(employee, context, now); // [UBAH] + employee
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
        var context = sys.hris.sims.attendance.service.AttendanceWorkday.resolve(
                employee, now.toLocalDateTime(), true, workScheduleRepository, attendanceRepository);
        return new ScheduleContext(context.workDate(), context.schedule());
    }

    // [UBAH] Memakai WorkHours.endAt(): sudah menangani shift malam (pulang di hari berikutnya).
    private boolean hasPassedWorkEnd(Employee employee, ScheduleContext context, ZonedDateTime now) {
        WorkHours workHours = WorkHoursResolver.resolve(employee, context.workDate(), context.schedule());
        return !now.toLocalDateTime().isBefore(workHours.endAt(context.workDate()));
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
        return toResponse(overtime, loadSortedSteps(overtime.getOvertimeId()));
    }

    // [BARU] Tahap selalu diurutkan menurut jenjang (Leader -> SPV -> Manager -> HRD), lalu id.
    private List<OvertimeApproval> loadSortedSteps(Long overtimeId) {
        return sortSteps(approvalRepository.findByOvertime_OvertimeIdOrderByApprovalIdAsc(overtimeId));
    }

    private static List<OvertimeApproval> sortSteps(List<OvertimeApproval> steps) {
        List<OvertimeApproval> sorted = new ArrayList<>(steps);
        sorted.sort(Comparator.comparingInt((OvertimeApproval step) -> ApprovalChainPolicy.stageRank(step.getApproverRole()))
                .thenComparing(OvertimeApproval::getApprovalId));
        return sorted;
    }

    // [BARU] Banyak pengajuan sekaligus: seluruh tahap dimuat per batch lalu dikelompokkan per pengajuan.
    private List<OvertimeResponse> toResponses(List<OvertimeRequest> requests) {
        Map<Long, List<OvertimeApproval>> stepsByOvertime = new HashMap<>();
        List<Long> ids = requests.stream().map(OvertimeRequest::getOvertimeId).toList();
        for (int from = 0; from < ids.size(); from += ID_BATCH_SIZE) {
            List<Long> batch = ids.subList(from, Math.min(from + ID_BATCH_SIZE, ids.size()));
            approvalRepository.findByOvertime_OvertimeIdInOrderByApprovalIdAsc(batch).forEach(step ->
                    stepsByOvertime.computeIfAbsent(step.getOvertime().getOvertimeId(), key -> new ArrayList<>()).add(step));
        }
        return requests.stream()
                .map(request -> toResponse(request, sortSteps(stepsByOvertime.getOrDefault(request.getOvertimeId(), List.of()))))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    // [UBAH] currentApproverEmployeeId hanya terisi bila pengajuan masih PENDING. Dulu pengajuan yang sudah
    // DITOLAK tetap menunjuk approver tahap berikutnya (tahap itu memang masih PENDING di database).
    private OvertimeResponse toResponse(OvertimeRequest overtime, List<OvertimeApproval> steps) {
        Long currentApproverId = !STATUS_PENDING.equals(overtime.getStatus()) ? null : steps.stream()
                .filter(step -> STATUS_PENDING.equals(step.getAction()))
                .map(step -> step.getApproverEmployee().getEmployeeId())
                .findFirst().orElse(null);
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
                        .map(step -> new OvertimeResponse.OvertimeApprovalStep(step.getApproverRole(),
                                step.getApproverEmployee().getEmployeeId(), step.getApproverEmployee().getFullName(),
                                step.getAction(), step.getActedAt(), step.getNote()))
                        .toList())
                .currentApproverEmployeeId(currentApproverId)
                .build();
    }
}
