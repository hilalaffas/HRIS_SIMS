package sys.hris.sims.common.dto;

import lombok.Data;

// [BARU] Body keputusan persetujuan (dipakai persetujuan Sakit & Lembur).
// status: "APPROVED" atau "REJECTED" (tidak case-sensitive).
@Data
public class ApprovalDecisionRequest {
    private String status;

    // [BARU] Catatan untuk karyawan -- wajib saat REJECTED pada persetujuan Sakit,
    // diabaikan oleh persetujuan Lembur.
    private String note;
}
