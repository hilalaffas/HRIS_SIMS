package sys.hris.sims.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String username;
    private String role;
    private String gender;      // <-- tambahan
    private Long employeeId;    // <-- tambahan (opsional, tapi berguna)
    private boolean devAccess;  // [BARU] true bila akun dev (lihat DevAccessService) -- frontend memakainya untuk panel /devAccess
}