package sys.hris.sims.attendance.dto;

import lombok.Data;

@Data
public class MedicalDocumentDecisionRequest {
    private String status;
    private String note;
    private String documentUrl;
}
