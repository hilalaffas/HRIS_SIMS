package sys.hris.sims.auth.dto;

import org.springframework.web.multipart.MultipartFile;

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

    private String nikKaryawan;
    private MultipartFile photo;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private Integer emergencyContactRelationshipId;
}
