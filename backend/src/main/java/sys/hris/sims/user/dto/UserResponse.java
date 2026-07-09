package sys.hris.sims.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponse {
    private Long idUser;
    private String username;
    private String email;
    private String role;
}