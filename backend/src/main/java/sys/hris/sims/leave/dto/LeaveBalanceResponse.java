package sys.hris.sims.leave.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaveBalanceResponse {
    private Long employeeId;
    private String employeeName;

    // Cuti Tahunan (otomatis, refresh tiap tahun ikut tanggal join)
    private BigDecimal annualQuota;
    private BigDecimal usedAnnualLeave;
    private BigDecimal remainingAnnualLeave;
    // [BARU] "Dapat digunakan hingga ..." di Dashboard -- null kalau belum berhak
    private LocalDate annualPeriodEnd;
    // [BARU] "Cuti tahunan mulai berlaku ..." -- null kalau sudah berhak
    private LocalDate annualEligibleFrom;

    // [BARU] Sisa Cuti (manual dari HR) -- dihitung ULANG dari histori,
    // BUKAN saldo yang langsung dikurangi (lihat LeaveService.getLeaveBalance)
    private BigDecimal manualLeaveAllocated;
    private BigDecimal remainingManualLeave;

    // [BARU] Gabungan keduanya -- inilah "Total" yang tampil di Dashboard
    // karyawan & di detail karyawan superadmin
    private BigDecimal totalRemainingLeave;
}
