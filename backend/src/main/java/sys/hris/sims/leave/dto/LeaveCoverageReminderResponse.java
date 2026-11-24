package sys.hris.sims.leave.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;

// [BARU] Dipakai reminder di form Ajukan Cuti (ApplyCuti.jsx): memberi tahu
// karyawan bahwa dirinya sudah dicantumkan sebagai "Dicover Oleh" pada
// pengajuan cuti milik rekan lain (yang masih PENDING/APPROVED) -- supaya dia
// sadar punya tanggung jawab cover sebelum mengajukan cutinya sendiri di
// tanggal yang sama. Lihat LeaveService.getMyCoverageReminders().
@Data
@AllArgsConstructor
public class LeaveCoverageReminderResponse {
    private Long leaveRequestId;
    // Nama karyawan yang harus di-cover (pemohon cuti).
    private String employeeName;
    private String leaveType;
    private LocalDate startDate;
    private LocalDate endDate;
    // Status berkas cuti yang di-cover ("PENDING"/"APPROVED").
    private String status;
}
