package sys.hris.sims.employee.dto; // Sesuaikan package Anda

import org.springframework.web.multipart.MultipartFile;

import lombok.Data;

@Data
public class UpdateEmployeeRequest {
    private String fullName;
    private String address;
    private String phoneNumber;
    private String gender;
    private String nikKaryawan;
    private Long divisiId;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private Integer emergencyContactRelationshipId;
    private MultipartFile photo; // Ini untuk foto baru
}