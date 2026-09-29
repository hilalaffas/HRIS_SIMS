package sys.hris.sims.attendance.dto;

import org.springframework.web.multipart.MultipartFile;

import lombok.Data;

// [BARU] Dipakai lewat @ModelAttribute di AttendanceController (pola sama
// seperti UpdateProfileRequest.java) karena request-nya multipart/form-data
// (ada file foto + field teks sekaligus). SENGAJA TIDAK ADA field jam/
// tanggal -- itu diisi backend sendiri (Attendance.prePersist()) supaya
// tidak bisa dimanipulasi dari sisi klien.
@Data
public class AttendanceSubmitRequest {
    // "MASUK" atau "KELUAR" (tidak case-sensitive, dinormalisasi di service)
    private String action;

    // "ABSEN" (default), "SAKIT", atau "IZIN"
    private String reason;

    private String note;

    // Wajib diisi -- lihat AttendanceService.submit(): tanpa koordinat GPS,
    // pengajuan ditolak dengan pesan yang jelas ke frontend.
    private Double latitude;
    private Double longitude;

    private MultipartFile photo;
}
