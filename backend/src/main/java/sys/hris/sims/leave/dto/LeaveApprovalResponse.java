package sys.hris.sims.leave.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LeaveApprovalResponse {
    private Long leaveRequestId;
    // [BARU] ID karyawan pemohon -- sebelumnya cuma ada employeeName (String).
    // Ditambahkan supaya frontend (ApproveLeave.jsx) bisa mencocokkan data
    // dari /api/cuti/balance/all dengan AMAN pakai ID unik, bukan nama
    // lengkap yang berisiko tabrakan kalau ada 2 karyawan bernama sama.
    private Long employeeId;
    private String employeeName;
    private String leaveType;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalDays;
    private String reason;
    private String pendingWork;
    private String coveredBy;
    private Long leaderEmployeeId;
    private String leaderName;
    private Long spvEmployeeId;
    private String spvName;
    private Long managerEmployeeId;
    private String managerName;
    private LocalDateTime submittedAt;
    private String overallStatus;
    private String myApprovalStatus;
    private String reviewNote;
    private List<LeaveApprovalLogResponse> approvalLogs;
}
