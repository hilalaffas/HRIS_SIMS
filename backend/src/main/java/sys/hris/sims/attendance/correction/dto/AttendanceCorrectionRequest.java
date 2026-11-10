package sys.hris.sims.attendance.correction.dto;

import lombok.Data;

@Data
public class AttendanceCorrectionRequest {
    private String attendanceDate;
    private String reason;
    private Long leaderEmployeeId;
    private Long spvEmployeeId;
    private Long managerEmployeeId;
}
