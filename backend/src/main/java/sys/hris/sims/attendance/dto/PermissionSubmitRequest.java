package sys.hris.sims.attendance.dto;

import org.springframework.web.multipart.MultipartFile;

import lombok.Data;

// [BARU] Pengajuan Izin / Sakit (popup "Ajukan Izin / Sakit"). Dipakai lewat
// @ModelAttribute karena request-nya multipart/form-data (field teks + file
// surat dokter opsional). Sama seperti AttendanceSubmitRequest, TIDAK ADA field
// jam absensi -- itu diisi server. Rentang sakit diterima dan divalidasi server.
@Data
public class PermissionSubmitRequest {
    // "SAKIT" atau "TERLAMBAT" (tidak case-sensitive)
    private String type;

    // Keterangan / alasan -- wajib, maksimal 255 karakter
    private String note;

    // Lama izin sakit dalam HARI KALENDER (1-30, termasuk akhir pekan/libur).
    // Diabaikan (jadi 1) untuk TERLAMBAT dan bila surat dokter belum dilampirkan.
    private Double days;
    @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE)
    private java.time.LocalDate startDate;
    @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE)
    private java.time.LocalDate endDate;
    private boolean documentLater;

    private boolean earlyCheckout;

    // Surat dokter -- opsional (boleh menyusul). Hanya dipakai untuk SAKIT.
    private MultipartFile document;
}
