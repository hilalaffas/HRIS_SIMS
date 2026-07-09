package sys.hris.sims.auth.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String password;
    private String email;
    
    private Long roleId;
    private String fullName;
    private String address;
    private String phoneNumber;
    private String gender;
}
