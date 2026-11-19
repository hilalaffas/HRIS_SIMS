package sys.hris.sims.attendance.correction.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.correction.dto.*;
import sys.hris.sims.attendance.correction.entity.*;
import sys.hris.sims.attendance.correction.repository.*;
import sys.hris.sims.attendance.entity.Attendance;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.common.service.HrdApproverPolicy;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;

@Service @RequiredArgsConstructor
public class AttendanceCorrectionService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Jakarta");
    private static final int MIN_REJECT_NOTE_LENGTH = 5; // [BARU] sama dengan aturan lembur
    private final AttendanceCorrectionRepository correctionRepository;
    private final AttendanceCorrectionApprovalRepository approvalRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final HrdApproverPolicy hrdApproverPolicy; // [BARU] aturan approver HRD

    private Employee employee(String username) {
        return employeeRepository.findFirstByUser_Username(username)
            .orElseThrow(() -> new IllegalStateException("Data karyawan tidak ditemukan."));
    }

    private String role(Employee employee) {
        return employee.getUser().getRoleId().getRoleName().trim().toUpperCase(Locale.ROOT).replace("ROLE_", "");
    }

    // Same hierarchy as leave: Member -> Leader -> SPV -> Manager;
    // Leader -> SPV -> Manager; SPV/Manager -> Manager. HRD retains its peer flow.
    private List<String> requiredRoles(Employee requester) {
        return sys.hris.sims.common.service.ApprovalHierarchy.forRole(role(requester));
    }

    private String field(String role) {
        return switch (role) {
            case "LEADER" -> "leaderEmployeeId";
            case "SPV" -> "spvEmployeeId";
            case "MANAGER" -> "managerEmployeeId";
            default -> "hrdEmployeeId";
        };
    }

    private boolean sameDivision(Employee requester, Employee approver) {
        return requester.getDivisi() != null && approver.getDivisi() != null
                && Objects.equals(requester.getDivisi().getId(), approver.getDivisi().getId());
    }

    @Transactional(readOnly = true)
    public CorrectionApproverOptions getApproverOptions(String username) {
        Employee requester = employee(username);
        var stages = requiredRoles(requester).stream().map(stage -> {
            List<Employee> people = stage.equals(HrdApproverPolicy.STAGE_ROLE)
                    ? hrdApproverPolicy.findSelectableApprovers(requester)
                    : employeeRepository.findActiveByRoleNamesUpper(Set.of(stage)).stream()
                        .filter(person -> sameDivision(requester, person))
                        .filter(person -> !Objects.equals(person.getEmployeeId(), requester.getEmployeeId())).toList();
            return new CorrectionApproverOptions.Stage(stage, field(stage), people.stream()
                    .map(person -> new CorrectionApproverOptions.Person(person.getEmployeeId(), person.getFullName())).toList());
        }).toList();
        return new CorrectionApproverOptions(stages);
    }

    private Employee selectedApprover(Long id, String expectedRole, Employee requester) {
        if (id == null || id <= 0) throw new IllegalArgumentException("Approver " + expectedRole + " wajib dipilih.");
        Employee approver = employeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Approver " + expectedRole + " tidak ditemukan."));
        if (!role(approver).equals(expectedRole) || !Boolean.TRUE.equals(approver.getIsActive()))
            throw new IllegalArgumentException("Pilih approver " + expectedRole + " yang masih aktif.");
        if (Objects.equals(approver.getEmployeeId(), requester.getEmployeeId()))
            throw new IllegalArgumentException("Anda tidak dapat memilih diri sendiri sebagai approver.");
        if (!sameDivision(requester, approver)) throw new IllegalArgumentException("Approver harus dari divisi yang sama dengan pemohon.");
        return approver;
    }

    private void createSteps(AttendanceCorrection correction, Employee requester, AttendanceCorrectionRequest request) {
        List<String> roles = requiredRoles(requester);
        if (roles.equals(List.of(HrdApproverPolicy.STAGE_ROLE))) {
            approvalRepository.save(step(correction, HrdApproverPolicy.STAGE_ROLE,
                    hrdApproverPolicy.requireSelectableApprover(request.getHrdEmployeeId(), requester)));
            return;
        }
        if ((!roles.contains("LEADER") && request.getLeaderEmployeeId() != null)
                || (!roles.contains("SPV") && request.getSpvEmployeeId() != null))
            throw new IllegalArgumentException("Pilih approver sesuai jenjang: " + String.join(" → ", roles) + ".");
        List<AttendanceCorrectionApproval> steps = new ArrayList<>();
        for (String stage : roles) {
            Long id = switch (stage) {
                case "LEADER" -> request.getLeaderEmployeeId();
                case "SPV" -> request.getSpvEmployeeId();
                default -> request.getManagerEmployeeId();
            };
            steps.add(step(correction, stage, selectedApprover(id, stage, requester)));
        }
        approvalRepository.saveAll(steps);
    }

    private AttendanceCorrectionApproval step(AttendanceCorrection correction, String role, Employee approver) {
        return AttendanceCorrectionApproval.builder().correction(correction).approverRole(role)
            .approverEmployee(approver).action("PENDING").build();
    }

    @Transactional
    public AttendanceCorrectionResponse submit(String username, AttendanceCorrectionRequest request) {
        Employee requester = employee(username);
        if (request.getAttendanceDate() == null || request.getAttendanceDate().isBlank())
            throw new IllegalArgumentException("Tanggal absensi wajib diisi.");
        LocalDate date = LocalDate.parse(request.getAttendanceDate());
        if (date.isAfter(LocalDate.now(ZONE))) throw new IllegalArgumentException("Tanggal absensi tidak boleh di masa depan.");
        Attendance attendance = attendanceRepository
            .findFirstByEmployee_EmployeeIdAndAttendanceDateAndAction(requester.getEmployeeId(), date, "MASUK")
            .orElseThrow(() -> new IllegalArgumentException("Data absen masuk pada tanggal tersebut tidak ditemukan."));
        if (!"LATE".equalsIgnoreCase(attendance.getStatus()))
            throw new IllegalArgumentException("Koreksi hanya dapat diajukan untuk absensi yang terlambat.");
        if (correctionRepository.existsByAttendance_AttendanceId(attendance.getAttendanceId()))
            throw new IllegalStateException("Pengajuan koreksi untuk tanggal ini sudah pernah dibuat.");
        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (reason.length() < 10 || reason.length() > 500)
            throw new IllegalArgumentException("Alasan koreksi harus 10 sampai 500 karakter.");
        AttendanceCorrection saved = correctionRepository.save(AttendanceCorrection.builder()
            .attendance(attendance).employee(requester).attendanceDate(date).reason(reason).status("PENDING").build());
        createSteps(saved, requester, request);
        return toResponse(saved, false);
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> getMine(String username) {
        Employee requester = employee(username);
        return correctionRepository.findByEmployee_EmployeeIdOrderByCreatedAtDesc(requester.getEmployeeId())
            .stream().map(item -> toResponse(item, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionResponse> getApprovals(Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream().anyMatch(a ->
            "ROLE_SUPER_ADMIN".equals(a.getAuthority()) || "ROLE_DEV".equals(a.getAuthority()));
        Long actorId = admin ? null : employee(authentication.getName()).getEmployeeId();
        // [UBAH] Performa: koreksi + tahap approval dimuat massal (sebelumnya 2 query per koreksi).
        List<AttendanceCorrection> corrections = correctionRepository.findAllWithDetails();
        Map<Long, List<AttendanceCorrectionApproval>> stepsByCorrection = corrections.isEmpty()
            ? Map.of()
            : approvalRepository.findAllByCorrectionIds(
                    corrections.stream().map(AttendanceCorrection::getCorrectionId).toList())
                .stream().collect(java.util.stream.Collectors.groupingBy(a -> a.getCorrection().getCorrectionId()));
        return corrections.stream()
            .sorted(Comparator.comparing(AttendanceCorrection::getCreatedAt).reversed())
            .map(item -> {
                List<AttendanceCorrectionApproval> steps = stepsByCorrection.getOrDefault(item.getCorrectionId(), List.of());
                return toResponse(item, actorId != null && Objects.equals(actorId, currentApprover(steps)), steps);
            })
            .filter(item -> admin || item.getApprovals().stream().anyMatch(a -> Objects.equals(actorId, a.getEmployeeId())))
            .toList();
    }

    @Transactional
    public AttendanceCorrectionResponse decide(Long id, String decision, String note, Authentication authentication) {
        String status = decision == null ? "" : decision.trim().toUpperCase(Locale.ROOT);
        if (!List.of("APPROVED", "REJECTED").contains(status))
            throw new IllegalArgumentException("Keputusan tidak valid.");
        Employee actor = employee(authentication.getName());
        AttendanceCorrection correction = correctionRepository.findForDecision(id)
            .orElseThrow(() -> new IllegalArgumentException("Pengajuan koreksi tidak ditemukan."));
        // [BARU] Pemohon tidak boleh memproses koreksinya sendiri.
        hrdApproverPolicy.assertNotOwnRequest(actor, correction.getEmployee());
        if (!"PENDING".equals(correction.getStatus())) throw new IllegalStateException("Pengajuan sudah diproses.");
        List<AttendanceCorrectionApproval> steps = approvalRepository.findByCorrection_CorrectionIdOrderByApprovalIdAsc(id);
        AttendanceCorrectionApproval mine = steps.stream()
            .filter(a -> actor.getEmployeeId().equals(a.getApproverEmployee().getEmployeeId())).findFirst()
            .orElseThrow(() -> new IllegalStateException("Anda bukan approver pengajuan ini."));
        String expectedRole = mine.getApproverRole();
        boolean validRole = HrdApproverPolicy.STAGE_ROLE.equals(expectedRole) ? HrdApproverPolicy.isHrd(actor) : role(actor).equals(expectedRole);
        if (!validRole || !Boolean.TRUE.equals(actor.getIsActive())) throw new IllegalStateException("Role approver sudah tidak sesuai atau akun tidak aktif.");
        if (!"PENDING".equals(mine.getAction())) throw new IllegalStateException("Tahap persetujuan ini sudah diproses.");
        int index = steps.indexOf(mine);
        if (steps.subList(0, index).stream().anyMatch(a -> !"APPROVED".equals(a.getAction())))
            throw new IllegalStateException("Menunggu persetujuan tahap sebelumnya.");
        String decisionNote = note == null ? "" : note.trim();
        if (decisionNote.length() > 500) throw new IllegalArgumentException("Catatan maksimal 500 karakter.");
        // [BARU] Penolakan wajib disertai alasan (dicek di server, bukan hanya di popup frontend).
        if ("REJECTED".equals(status) && decisionNote.length() < MIN_REJECT_NOTE_LENGTH)
            throw new IllegalArgumentException("Alasan penolakan wajib diisi (minimal " + MIN_REJECT_NOTE_LENGTH + " karakter).");
        mine.setAction(status);
        mine.setActedAt(LocalDateTime.now(ZONE));
        mine.setNote(decisionNote.isEmpty() ? null : decisionNote);
        if ("REJECTED".equals(status)) {
            correction.setStatus("REJECTED");
        } else if (steps.stream().allMatch(a -> a == mine ? "APPROVED".equals(status) : "APPROVED".equals(a.getAction()))) {
            correction.setStatus("APPROVED");
            // Koreksi yang disetujui mengubah klasifikasi kehadiran menjadi tepat waktu.
            // recordedAt/attendanceDate sengaja tidak disentuh agar jam absen asli tetap tercatat.
            Attendance attendance = correction.getAttendance();
            attendance.setStatus("ON_TIME");
            attendanceRepository.save(attendance);
        }
        approvalRepository.save(mine);
        correctionRepository.save(correction);
        return toResponse(correction, false);
    }

    private Long currentApprover(AttendanceCorrection correction) {
        return currentApprover(approvalRepository.findByCorrection_CorrectionIdOrderByApprovalIdAsc(correction.getCorrectionId()));
    }

    // [BARU] Versi dengan tahap approval yang sudah dimuat (tanpa query).
    private Long currentApprover(List<AttendanceCorrectionApproval> steps) {
        if (steps.stream().anyMatch(a -> "REJECTED".equals(a.getAction()))) return null;
        return steps.stream()
            .filter(a -> "PENDING".equals(a.getAction())).map(a -> a.getApproverEmployee().getEmployeeId()).findFirst().orElse(null);
    }

    private AttendanceCorrectionResponse toResponse(AttendanceCorrection item, boolean canAct) {
        return toResponse(item, canAct, approvalRepository.findByCorrection_CorrectionIdOrderByApprovalIdAsc(item.getCorrectionId()));
    }

    // [UBAH] Isi method lama dipindah ke sini; steps diberikan pemanggil (bisa hasil pemuatan massal).
    private AttendanceCorrectionResponse toResponse(AttendanceCorrection item, boolean canAct,
                                                    List<AttendanceCorrectionApproval> steps) {
        return AttendanceCorrectionResponse.builder()
            .correctionId(item.getCorrectionId()).attendanceId(item.getAttendance().getAttendanceId())
            .employeeId(item.getEmployee().getEmployeeId()).employeeName(item.getEmployee().getFullName())
            .attendanceDate(item.getAttendanceDate()).reason(item.getReason()).status(item.getStatus())
            .reviewNote(item.getReviewNote()).createdAt(item.getCreatedAt())
            .currentApproverEmployeeId("PENDING".equals(item.getStatus()) ? currentApprover(steps) : null)
            .canAct(canAct && "PENDING".equals(item.getStatus())).approvals(steps.stream().map(a -> new AttendanceCorrectionResponse.ApprovalStep(
                a.getApproverRole(), a.getApproverEmployee().getEmployeeId(), a.getApproverEmployee().getFullName(),
                a.getAction(), a.getActedAt(), a.getNote())).toList())
            .build();
    }
}
