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
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;

@Service @RequiredArgsConstructor
public class AttendanceCorrectionService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Jakarta");
    private final AttendanceCorrectionRepository correctionRepository;
    private final AttendanceCorrectionApprovalRepository approvalRepository;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;

    private Employee employee(String username) {
        return employeeRepository.findFirstByUser_Username(username)
            .orElseThrow(() -> new IllegalStateException("Data karyawan tidak ditemukan."));
    }

    private String role(Employee e) {
        String role = e.getUser().getRoleId().getRoleName();
        String value = role == null ? "" : role.trim().toUpperCase(Locale.ROOT).replace("ROLE_", "");
        if (value.contains("LEADER")) return "LEADER";
        if (value.contains("SPV") || value.contains("SUPERVISOR")) return "SPV";
        if (value.contains("MANAGER")) return "MANAGER";
        return value;
    }

    private Employee selected(Long id, String expected, Employee requester) {
        if (id == null) throw new IllegalArgumentException("Nama approval " + expected + " wajib dipilih.");
        Employee approver = employeeRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Approver " + expected + " tidak ditemukan."));
        if (!expected.equals(role(approver))) throw new IllegalArgumentException("Approver harus memiliki role " + expected + ".");
        if (!Boolean.TRUE.equals(approver.getIsActive())) throw new IllegalArgumentException("Approver " + expected + " sudah tidak aktif.");
        if (requester.getDivisi() == null || approver.getDivisi() == null
            || !requester.getDivisi().getId().equals(approver.getDivisi().getId()))
            throw new IllegalArgumentException("Approver harus berasal dari divisi yang sama.");
        if (requester.getEmployeeId().equals(approver.getEmployeeId()))
            throw new IllegalArgumentException("Karyawan tidak dapat menjadi approver untuk pengajuannya sendiri.");
        return approver;
    }

    private void createSteps(AttendanceCorrection correction, Employee requester, AttendanceCorrectionRequest request) {
        String requesterRole = role(requester);
        List<AttendanceCorrectionApproval> steps = new ArrayList<>();
        if ("LEADER".equals(requesterRole)) {
            steps.add(step(correction, "SPV", selected(request.getSpvEmployeeId(), "SPV", requester)));
            steps.add(step(correction, "MANAGER", selected(request.getManagerEmployeeId(), "MANAGER", requester)));
        } else if ("SPV".equals(requesterRole)) {
            steps.add(step(correction, "MANAGER", selected(request.getManagerEmployeeId(), "MANAGER", requester)));
        } else if ("MANAGER".equals(requesterRole)) {
            steps.add(step(correction, "MANAGER", selected(request.getManagerEmployeeId(), "MANAGER", requester)));
        } else {
            steps.add(step(correction, "LEADER", selected(request.getLeaderEmployeeId(), "LEADER", requester)));
            steps.add(step(correction, "SPV", selected(request.getSpvEmployeeId(), "SPV", requester)));
            steps.add(step(correction, "MANAGER", selected(request.getManagerEmployeeId(), "MANAGER", requester)));
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
        AttendanceCorrection correction = correctionRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Pengajuan koreksi tidak ditemukan."));
        if (!"PENDING".equals(correction.getStatus())) throw new IllegalStateException("Pengajuan sudah diproses.");
        List<AttendanceCorrectionApproval> steps = approvalRepository.findByCorrection_CorrectionIdOrderByApprovalIdAsc(id);
        AttendanceCorrectionApproval mine = steps.stream()
            .filter(a -> actor.getEmployeeId().equals(a.getApproverEmployee().getEmployeeId())).findFirst()
            .orElseThrow(() -> new IllegalStateException("Anda bukan approver pengajuan ini."));
        if (!"PENDING".equals(mine.getAction())) throw new IllegalStateException("Tahap persetujuan ini sudah diproses.");
        int index = steps.indexOf(mine);
        if (steps.subList(0, index).stream().anyMatch(a -> !"APPROVED".equals(a.getAction())))
            throw new IllegalStateException("Menunggu persetujuan tahap sebelumnya.");
        String decisionNote = note == null ? "" : note.trim();
        if (decisionNote.length() > 500) throw new IllegalArgumentException("Catatan maksimal 500 karakter.");
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
            .currentApproverEmployeeId(steps.stream().filter(a -> "PENDING".equals(a.getAction()))
                .map(a -> a.getApproverEmployee().getEmployeeId()).findFirst().orElse(null))
            .canAct(canAct).approvals(steps.stream().map(a -> new AttendanceCorrectionResponse.ApprovalStep(
                a.getApproverRole(), a.getApproverEmployee().getEmployeeId(), a.getApproverEmployee().getFullName(),
                a.getAction(), a.getActedAt(), a.getNote())).toList())
            .build();
    }
}
