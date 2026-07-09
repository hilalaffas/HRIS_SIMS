package sys.hris.sims.passwordreset.dto;

import lombok.Data;

@Data
public class ApprovePasswordResetRequest {

    private String dummyPassword;

    private String notes;

}