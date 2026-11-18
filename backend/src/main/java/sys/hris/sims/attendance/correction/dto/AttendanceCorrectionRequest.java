package sys.hris.sims.attendance.correction.dto;

import lombok.Data;

@Data
public class AttendanceCorrectionRequest {
    private String attendanceDate;
    private String reason;
    private Long leaderEmployeeId;
    private Long spvEmployeeId;
    private Long managerEmployeeId;
    // Khusus pengajuan dari HRD, tetap memilih satu rekan HRD.
    private Long hrdEmployeeId;
}
