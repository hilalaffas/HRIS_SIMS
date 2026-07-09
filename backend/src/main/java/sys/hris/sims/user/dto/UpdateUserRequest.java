package sys.hris.sims.user.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String username;
    private String email;
    private Long idRole;
    private String password;
}