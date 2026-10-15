package sys.hris.sims.overtime.dto;

import java.time.LocalTime;

import lombok.Data;

// [BARU] Body JSON "Tambah Lembur" saat check-out (lembur susulan yang tidak
// sesuai pengajuan awal). SENGAJA hanya endTime + reason: tanggal selalu hari
// ini dan jam MULAI dihitung server (lanjutan dari lembur terakhir / jam
// pulang), supaya klien tidak bisa membuat celah atau tumpang tindih jam.
@Data
public class OvertimeExtensionRequest {
    private LocalTime endTime;
    private String reason;
}
