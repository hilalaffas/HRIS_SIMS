package sys.hris.sims.devtools.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// [BARU] Satu baris saldo cuti untuk panel penyesuaian cuti di /devAccess.
// eligible=false -> belum berhak cuti tahunan (annualEligibleFrom = tanggal mulai berhak).
public record DevLeaveRow(
        Long employeeId,
        String username,
        String fullName,
        LocalDate joinDate,
        boolean eligible,
        LocalDate annualEligibleFrom,
        LocalDate periodStart,
        LocalDate periodEnd,
        BigDecimal annualQuota,
        BigDecimal annualUsed,
        BigDecimal annualUsedOutsideSystem,
        BigDecimal annualRemaining,
        BigDecimal oldLeaveBalance) {
}
