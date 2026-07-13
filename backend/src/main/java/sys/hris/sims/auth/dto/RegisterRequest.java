package sys.hris.sims.auth.dto;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat; // Tambahkan import ini
import org.springframework.web.multipart.MultipartFile; // Tambahkan import ini

import lombok.Data;

@Data
public class RegisterRequest {
    private String username;
    private String password;
    private String email;
    
    private Long roleId;
    private Long divisiId;
    private String fullName;
    private String address;
    private String phoneNumber;
    private String gender;

    private String nikKaryawan;
    private MultipartFile photo;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private Integer emergencyContactRelationshipId;
    private String joinDate;
}