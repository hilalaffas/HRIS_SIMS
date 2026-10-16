package sys.hris.sims.attendance.dto;

import org.springframework.web.multipart.MultipartFile;

import lombok.Data;

// [BARU] Pengajuan Izin / Sakit (popup "Ajukan Izin / Sakit"). Dipakai lewat
// @ModelAttribute karena request-nya multipart/form-data (field teks + file
// surat dokter opsional). Sama seperti AttendanceSubmitRequest, TIDAK ADA field
// jam/tanggal -- itu diisi server.
@Data
public class PermissionSubmitRequest {
    // "SAKIT" atau "TERLAMBAT" (tidak case-sensitive)
    private String type;

    // Keterangan / alasan -- wajib, maksimal 255 karakter
    private String note;

    // Lama izin sakit dalam hari (1-30). Diabaikan untuk TERLAMBAT.
    private Integer days;

    // Surat dokter -- opsional (boleh menyusul). Hanya dipakai untuk SAKIT.
    private MultipartFile document;
}
