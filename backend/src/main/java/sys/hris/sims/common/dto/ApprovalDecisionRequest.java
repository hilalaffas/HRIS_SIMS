package sys.hris.sims.common.dto;

import lombok.Data;

// [BARU] Body keputusan persetujuan (dipakai persetujuan Sakit & Lembur).
// status: "APPROVED" atau "REJECTED" (tidak case-sensitive).
@Data
public class ApprovalDecisionRequest {
    private String status;
}
