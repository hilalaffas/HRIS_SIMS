package sys.hris.sims.profile.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String address;
    private String email;
    private String phoneNumber;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;
    private MultipartFile photo;
}
