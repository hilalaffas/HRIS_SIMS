package sys.hris.sims.leave.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

// [BARU] Dipakai lonceng notifikasi karyawan (Navbar.jsx) untuk memberi tahu
// pemohon SETIAP KALI salah satu approver (Leader/SPV/Manager) menyetujui
// tahapannya -- walau berkas SECARA KESELURUHAN belum tuntas (masih menunggu
// approver lain). Begitu berkas sudah final (APPROVED/REJECTED/RETURNED),
// baris ini otomatis berhenti muncul karena query di
// LeaveService.getMyApprovalStepUpdates() mensyaratkan status induk masih
// PENDING. Notifikasi status FINAL (sudah disetujui semua/ditolak/dikembalikan)
// tetap ditangani terpisah lewat data /api/cuti/me yang sudah ada di
// Navbar.jsx, jadi tidak ada notifikasi ganda.
@Data
@AllArgsConstructor
public class LeaveStepNotificationResponse {
    private Long leaveRequestId;
    private Long approvalId;
    private String approverRole;
    private String approverName;
    private String leaveType;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime actedAt;
}
