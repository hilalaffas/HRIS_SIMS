package sys.hris.sims.attendance.correction.dto;

import lombok.Data;

@Data
public class AttendanceCorrectionRequest {
    private String attendanceDate;
    private String reason;
    private Long leaderEmployeeId;
    private Long spvEmployeeId;
    private Long managerEmployeeId;
    // [BARU] Approver HRD (satu nama). Field leader/spv/manager di atas diabaikan untuk pengajuan baru.
    private Long hrdEmployeeId;
}
