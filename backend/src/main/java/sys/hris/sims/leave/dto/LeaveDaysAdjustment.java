package sys.hris.sims.leave.dto;

import java.math.BigDecimal;

/**
 * [BARU] Hasil hitung ulang total hari cuti akibat perubahan hari libur.
 * Dipakai HolidayService untuk mencatat perubahan ke Log Sistem.
 */
public record LeaveDaysAdjustment(
        Long leaveRequestId,
        String employeeName,
        String statusName,
        BigDecimal oldTotalDays,
        BigDecimal newTotalDays) {

    /** Kalimat untuk Log Sistem (ditampilkan apa adanya di menu Log Sistem). */
    public String describe() {
        return "Total hari cuti " + employeeName + " (#" + leaveRequestId + ", " + statusName
                + ") dihitung ulang karena perubahan hari libur: "
                + plain(oldTotalDays) + " menjadi " + plain(newTotalDays) + " hari";
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
