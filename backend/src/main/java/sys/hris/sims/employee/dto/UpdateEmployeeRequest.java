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

    // [BARU] Field yang sebelumnya sudah dikirim/ditampilkan di frontend
    // (ModalDetailKaryawan.jsx) tapi belum ada tempat menampungnya di DTO,
    // sehingga selalu hilang setiap kali form disimpan.
    private String position;      // Jabatan
    private Boolean isActive;     // Status akun: Aktif / Nonaktif
    private String joinDate;      // Tanggal gabung, format yyyy-MM-dd (di-parse manual di controller)
}