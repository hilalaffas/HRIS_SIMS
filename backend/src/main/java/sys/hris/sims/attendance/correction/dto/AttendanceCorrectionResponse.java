package sys.hris.sims.attendance.correction.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AttendanceCorrectionResponse {
    private Long correctionId;
    private Long attendanceId;
    private Long employeeId;
    private String employeeName;
    private LocalDate attendanceDate;
    private String reason;
    private String status;
    private String reviewNote;
    private LocalDateTime createdAt;
    private Long currentApproverEmployeeId;
    private Boolean canAct;
    private List<ApprovalStep> approvals;

    @Data @AllArgsConstructor @NoArgsConstructor
    public static class ApprovalStep {
        private String role;
        private Long employeeId;
        private String employeeName;
        private String action;
        private LocalDateTime actedAt;
        private String note;
    }
}
