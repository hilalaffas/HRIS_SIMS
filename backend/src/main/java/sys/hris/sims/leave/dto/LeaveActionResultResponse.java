package sys.hris.sims.leave.dto;

import java.time.LocalDateTime;

import sys.hris.sims.leave.entity.LeaveRequest;

// [BARU] Hasil ringkas aksi approve / reject / return cuti.
// Dulu controller mengembalikan entity LeaveRequest utuh; saat di-serialisasi ke JSON, relasi lazy
// (Employee.divisi) ikut dibaca di luar transaksi -> error "Could not initialize proxy [Divisi] - no session"
// (HTTP 500) PADAHAL aksinya sudah tersimpan di database. DTO ini hanya memuat field sederhana.
public record LeaveActionResultResponse(
        Long leaveRequestId,
        String status,
        String reviewNote,
        LocalDateTime approvedAt,
        LocalDateTime returnedAt) {

    public static LeaveActionResultResponse from(LeaveRequest cuti) {
        return new LeaveActionResultResponse(
                cuti.getLeaveRequestId(),
                cuti.getStatus() == null ? null : cuti.getStatus().getStatusName(),
                cuti.getReviewNote(),
                cuti.getApprovedAt(),
                cuti.getReturnedAt());
    }
}
