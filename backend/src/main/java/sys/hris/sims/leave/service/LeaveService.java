package sys.hris.sims.leave.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.dto.LeaveBalanceResponse;
import sys.hris.sims.leave.dto.LeaveApprovalLogResponse;
import sys.hris.sims.leave.dto.LeaveApprovalResponse;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.entity.LeaveRequestApproval;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.leave.repository.LeaveRequestApprovalRepository;
import sys.hris.sims.leavestatus.entity.LeaveStatus;
import sys.hris.sims.leavestatus.repository.LeaveStatusRepository;
import sys.hris.sims.leavetype.entity.LeaveType;
import sys.hris.sims.leavetype.repository.LeaveTypeRepository;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LeaveService {
    private static final String ACTION_PENDING = "PENDING";
    private static final String ACTION_APPROVED = "APPROVED";
    private static final String ACTION_REJECTED = "REJECTED";
    private static final String ACTION_RETURNED = "RETURNED";
    private static final List<String> REQUIRED_APPROVER_ROLES = List.of("LEADER", "SPV", "MANAGER");
    private static final String ROLE_LEADER = "LEADER";
    private static final String ROLE_SPV = "SPV";
    private static final String ROLE_MANAGER = "MANAGER";

    private final LeaveRepository cutiRepository;
    private final EmployeeRepository karyawanRepository;
    private final LeaveStatusRepository statusCutiRepository;
    private final LeaveRequestApprovalRepository approvalRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final UserRepository userRepository;

    public List<LeaveRequest> getAllCuti() {
        return cutiRepository.findAll();
    }

    public LeaveRequest getCutiById(Long id) {
        return cutiRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cuti tidak ditemukan"));
    }

    public List<LeaveRequest> getCutiByKaryawan(Long employeeId) {
        return cutiRepository.findByEmployee_EmployeeId(employeeId);
    }

    public LeaveRequest createCuti(LeaveRequest cuti) {
        return createCuti(cuti, null);
    }

    public LeaveRequest createCuti(LeaveRequest cuti, String requesterUsername) {
        Employee requester = cuti.getEmployee();
        if (requester == null && requesterUsername != null) {
            requester = getEmployeeByUsername(requesterUsername);
            cuti.setEmployee(requester);
        } else if (requester != null && requester.getEmployeeId() != null) {
            requester = karyawanRepository.findById(requester.getEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Karyawan pemohon tidak ditemukan"));
            cuti.setEmployee(requester);
        }

        if (requester == null) {
            throw new RuntimeException("Karyawan pemohon wajib diisi");
        }

        long totalDays = cuti.getStartDate()
                .datesUntil(cuti.getEndDate().plusDays(1))
                .count();

        cuti.setTotalDays((int) totalDays);
        cuti.setStatus(getStatus(ACTION_PENDING));

        LeaveRequest savedCuti = cutiRepository.save(cuti);
        createApprovalSteps(savedCuti, requester);
        return savedCuti;
    }

    public LeaveRequest approveCuti(Long leaveRequestId, Long reviewerId) {
        Employee reviewer = karyawanRepository.findById(reviewerId)
                .orElseThrow(() -> new RuntimeException("Reviewer tidak ditemukan"));
        return approveCuti(leaveRequestId, reviewer.getUser().getUsername(), null);
    }

    public LeaveRequest approveCuti(Long leaveRequestId, String reviewerUsername, String note) {
        return processApprovalAction(leaveRequestId, reviewerUsername, ACTION_APPROVED, note);
    }

    public LeaveRequest rejectCuti(Long leaveRequestId, Long reviewerId, String note) {
        Employee reviewer = karyawanRepository.findById(reviewerId)
                .orElseThrow(() -> new RuntimeException("Reviewer tidak ditemukan"));
        return rejectCuti(leaveRequestId, reviewer.getUser().getUsername(), note);
    }

    public LeaveRequest rejectCuti(Long leaveRequestId, String reviewerUsername, String note) {
        return processApprovalAction(leaveRequestId, reviewerUsername, ACTION_REJECTED, note);
    }

    public LeaveRequest returnCuti(Long leaveRequestId, String reviewerUsername, String note) {
        return processApprovalAction(leaveRequestId, reviewerUsername, ACTION_RETURNED, note);
    }

    public List<LeaveApprovalResponse> getApprovalTasks(String username) {
        Employee approver = getCurrentApprover(username);
        return approvalRepository.findByApproverEmployee_EmployeeIdAndAction(approver.getEmployeeId(), ACTION_PENDING).stream()
                .map(LeaveRequestApproval::getLeaveRequest)
                .filter(cuti -> ACTION_PENDING.equalsIgnoreCase(cuti.getStatus().getStatusName()))
                .map(cuti -> toApprovalResponse(cuti, approver.getEmployeeId()))
                .toList();
    }

    public List<LeaveApprovalResponse> getApprovalHistory(String username, String status) {
        Employee approver = getCurrentApprover(username);
        return approvalRepository.findByApproverEmployee_EmployeeId(approver.getEmployeeId()).stream()
                .map(LeaveRequestApproval::getLeaveRequest)
                .distinct()
                .filter(cuti -> status == null || status.isBlank()
                        || cuti.getStatus().getStatusName().equalsIgnoreCase(status))
                .map(cuti -> toApprovalResponse(cuti, approver.getEmployeeId()))
                .toList();
    }

    public LeaveBalanceResponse getMyLeaveBalance(String username) {
        Employee employee = getEmployeeByUsername(username);
        LeaveType annualLeave = leaveTypeRepository.findByNameIgnoreCase("Cuti tahunan")
                .orElse(null);

        Integer annualQuota = getAnnualQuota(employee, annualLeave);
        Integer usedAnnualLeave = getCutiByKaryawan(employee.getEmployeeId()).stream()
                .filter(cuti -> ACTION_APPROVED.equalsIgnoreCase(cuti.getStatus().getStatusName()))
                .filter(cuti -> Boolean.TRUE.equals(cuti.getLeaveType().getDeductsAnnualQuota()))
                .map(LeaveRequest::getTotalDays)
                .reduce(0, Integer::sum);

        return new LeaveBalanceResponse(
                employee.getEmployeeId(),
                employee.getFullName(),
                annualQuota,
                usedAnnualLeave,
                Math.max(annualQuota - usedAnnualLeave, 0)
        );
    }

    public void deleteCuti(Long id) {
        LeaveRequest cuti = getCutiById(id);
        cutiRepository.delete(cuti);
    }

    private LeaveRequest processApprovalAction(Long leaveRequestId, String reviewerUsername, String action, String note) {
        LeaveRequest cuti = getCutiById(leaveRequestId);
        Employee reviewer = getEmployeeByUsername(reviewerUsername);
        String approverRole = normalizeApproverRole(reviewer.getUser().getRoleId().getRoleName());

        if (!REQUIRED_APPROVER_ROLES.contains(approverRole)) {
            throw new RuntimeException("Role ini tidak memiliki akses approval cuti");
        }

        if (!ACTION_PENDING.equalsIgnoreCase(cuti.getStatus().getStatusName())) {
            throw new RuntimeException("Cuti ini sudah tidak dalam status pending");
        }

        LeaveRequestApproval approval = approvalRepository
                .findByLeaveRequest_LeaveRequestIdAndApproverEmployee_EmployeeId(leaveRequestId, reviewer.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Approval untuk user ini tidak ditemukan"));

        if (!approverRole.equalsIgnoreCase(approval.getApproverRole())) {
            throw new RuntimeException("Role user login tidak sesuai dengan approval yang ditugaskan");
        }

        if (!ACTION_PENDING.equalsIgnoreCase(approval.getAction())) {
            throw new RuntimeException("Role ini sudah melakukan tindakan untuk cuti ini");
        }

        approval.setAction(action);
        approval.setApproverEmployee(reviewer);
        approval.setNote(note);
        approval.setActedAt(LocalDateTime.now());
        approvalRepository.save(approval);

        cuti.setReviewedBy(reviewer);
        cuti.setReviewNote(note);

        if (ACTION_REJECTED.equals(action)) {
            cuti.setStatus(getStatus(ACTION_REJECTED));
            cuti.setApprovedAt(LocalDateTime.now());
        } else if (ACTION_RETURNED.equals(action)) {
            cuti.setStatus(getStatus(ACTION_RETURNED));
            cuti.setReturnedAt(LocalDateTime.now());
        } else if (isAllApprovalsApproved(leaveRequestId)) {
            cuti.setStatus(getStatus(ACTION_APPROVED));
            cuti.setApprovedAt(LocalDateTime.now());
        }

        return cutiRepository.save(cuti);
    }

    private void createApprovalSteps(LeaveRequest cuti, Employee requester) {
        List<LeaveRequestApproval> approvals = new ArrayList<>();
        String requesterRole = normalizeApproverRole(requester.getUser().getRoleId().getRoleName());

        if (REQUIRED_APPROVER_ROLES.contains(requesterRole)) {
            if (hasValue(cuti.getLeaderEmployeeId()) || hasValue(cuti.getSpvEmployeeId())) {
                throw new RuntimeException("Cuti Leader/SPV/Manager hanya boleh memilih approver Manager");
            }

            Employee manager = getSelectedApprover(cuti.getManagerEmployeeId(), ROLE_MANAGER);
            if (manager.getEmployeeId().equals(requester.getEmployeeId())) {
                throw new RuntimeException("Manager tidak boleh approve cuti miliknya sendiri");
            }
            approvals.add(buildApproval(cuti, ROLE_MANAGER, manager));
        } else {
            approvals.add(buildApproval(cuti, ROLE_LEADER, getSelectedApprover(cuti.getLeaderEmployeeId(), ROLE_LEADER)));
            approvals.add(buildApproval(cuti, ROLE_SPV, getSelectedApprover(cuti.getSpvEmployeeId(), ROLE_SPV)));
            approvals.add(buildApproval(cuti, ROLE_MANAGER, getSelectedApprover(cuti.getManagerEmployeeId(), ROLE_MANAGER)));
        }

        approvalRepository.saveAll(approvals);
    }

    private boolean isAllApprovalsApproved(Long leaveRequestId) {
        Map<String, String> actionsByRole = approvalRepository.findByLeaveRequest_LeaveRequestId(leaveRequestId)
                .stream()
                .collect(Collectors.toMap(
                        LeaveRequestApproval::getApproverRole,
                        LeaveRequestApproval::getAction,
                        (existing, replacement) -> existing
                ));

        return !actionsByRole.isEmpty() && actionsByRole.values().stream()
                .allMatch(ACTION_APPROVED::equals);
    }

    private LeaveApprovalResponse toApprovalResponse(LeaveRequest cuti, Long currentEmployeeId) {
        List<LeaveRequestApproval> approvals = approvalRepository.findByLeaveRequest_LeaveRequestId(cuti.getLeaveRequestId());
        String myApprovalStatus = approvals.stream()
                .filter(approval -> approval.getApproverEmployee() != null
                        && approval.getApproverEmployee().getEmployeeId().equals(currentEmployeeId))
                .map(LeaveRequestApproval::getAction)
                .findFirst()
                .orElse(null);

        List<LeaveApprovalLogResponse> logs = approvals.stream()
                .map(approval -> new LeaveApprovalLogResponse(
                        approval.getApproverRole(),
                        approval.getAction(),
                        approval.getApproverEmployee() == null ? null : approval.getApproverEmployee().getFullName(),
                        approval.getNote(),
                        approval.getActedAt()
                ))
                .toList();

        return new LeaveApprovalResponse(
                cuti.getLeaveRequestId(),
                cuti.getEmployee().getFullName(),
                cuti.getLeaveType().getName(),
                cuti.getStartDate(),
                cuti.getEndDate(),
                cuti.getTotalDays(),
                cuti.getReason(),
                cuti.getPendingWork(),
                cuti.getCoveredBy(),
                cuti.getStatus().getStatusName(),
                myApprovalStatus,
                cuti.getReviewNote(),
                logs
        );
    }

    private Employee getCurrentApprover(String username) {
        Employee employee = getEmployeeByUsername(username);
        String role = normalizeApproverRole(employee.getUser().getRoleId().getRoleName());

        if (!REQUIRED_APPROVER_ROLES.contains(role)) {
            throw new RuntimeException("Role ini tidak memiliki akses approval cuti");
        }

        return employee;
    }

    private Employee getEmployeeByUsername(String username) {
        return karyawanRepository.findFirstByUser_Username(username)
                .orElseGet(() -> createEmployeeProfileForExistingUser(username));
    }

    private Employee createEmployeeProfileForExistingUser(String username) {
        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new RuntimeException("User login tidak ditemukan");
        }

        Employee employee = Employee.builder()
                .user(user)
                .fullName(user.getUsername())
                .gender("L")
                .isActive(true)
                .build();

        return karyawanRepository.save(employee);
    }

    private LeaveStatus getStatus(String statusName) {
        return statusCutiRepository.findByStatusNameIgnoreCase(statusName)
                .orElseThrow(() -> new RuntimeException("Status cuti " + statusName + " tidak ditemukan"));
    }

    private Integer getAnnualQuota(Employee employee, LeaveType annualLeave) {
        if (annualLeave == null) {
            return 12;
        }

        if ("F".equalsIgnoreCase(employee.getGender()) || "P".equalsIgnoreCase(employee.getGender())) {
            return annualLeave.getQuotaFemale();
        }

        return annualLeave.getQuotaMale();
    }

    private String normalizeApproverRole(String roleName) {
        return roleName == null ? "" : roleName.trim().toUpperCase(Locale.ROOT);
    }

    private boolean hasValue(Long value) {
        return value != null && value > 0;
    }

    private Employee getSelectedApprover(Long employeeId, String expectedRole) {
        if (!hasValue(employeeId)) {
            throw new RuntimeException("Approver " + expectedRole + " wajib dipilih");
        }

        Employee employee = karyawanRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Approver " + expectedRole + " tidak ditemukan"));
        String role = normalizeApproverRole(employee.getUser().getRoleId().getRoleName());

        if (!expectedRole.equals(role)) {
            throw new RuntimeException("Approver yang dipilih harus memiliki role " + expectedRole);
        }

        return employee;
    }

    private LeaveRequestApproval buildApproval(LeaveRequest cuti, String role, Employee approver) {
        return LeaveRequestApproval.builder()
                .leaveRequest(cuti)
                .approverRole(role)
                .approverEmployee(approver)
                .action(ACTION_PENDING)
                .build();
    }
}
