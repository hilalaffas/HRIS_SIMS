package sys.hris.sims.passwordreset.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {

    @NotBlank(message = "Username tidak boleh kosong")
    private String username;

}