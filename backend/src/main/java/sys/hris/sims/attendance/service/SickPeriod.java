package sys.hris.sims.attendance.service;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import sys.hris.sims.attendance.entity.Attendance;
import sys.hris.sims.attendance.dto.PermissionSubmitRequest;

// New requests use explicit inclusive calendar dates. Legacy rows keep their old working-day coverage.
public record SickPeriod(LocalDate start, LocalDate end, double days) {
    public static SickPeriod resolve(PermissionSubmitRequest request, LocalDate today, boolean hasDocument) {
        Double input = request.getDays();
        if (input != null && !Double.isFinite(input)) throw new IllegalArgumentException("Lama sakit tidak valid.");
        LocalDate start = request.getStartDate() == null ? today : request.getStartDate();
        if (request.isEarlyCheckout()) {
            double days = input == null ? 1 : input;
            if ((days != 0.5 && days != 1) || !start.equals(today) || request.getEndDate() != null && !request.getEndDate().equals(today))
                throw new IllegalArgumentException("Izin sakit pulang cepat hanya tanggal hari ini, durasi 0,5 atau 1 hari.");
            return new SickPeriod(today, today, days);
        }
        if (request.isDocumentLater() || !hasDocument) {
            if (!start.equals(today) || request.getEndDate() != null && !request.getEndDate().equals(today) || input != null && input != 1)
                throw new IllegalArgumentException("Surat dokter menyusul: tanggal harus hari ini (WIB), durasi 1 hari.");
            return new SickPeriod(today, today, 1);
        }
        double requestedDays = input == null ? 1 : input;
        if (input != null && (requestedDays < 1 || requestedDays > 30 || requestedDays != Math.floor(requestedDays)))
            throw new IllegalArgumentException("Lama sakit harus 1 sampai 30 hari kalender.");
        LocalDate end = request.getEndDate() == null ? start.plusDays((long) requestedDays - 1) : request.getEndDate();
        long actualDays = ChronoUnit.DAYS.between(start, end) + 1;
        if (actualDays < 1 || actualDays > 30 || input != null && actualDays != requestedDays)
            throw new IllegalArgumentException("Tanggal dan lama sakit harus sesuai, maksimal 30 hari kalender.");
        return new SickPeriod(start, end, actualDays);
    }
    public static boolean covers(Attendance record, LocalDate date) {
        if (!"SAKIT".equals(record.getReason()) || "REJECTED".equals(record.getApprovalStatus())) return false;
        LocalDate start = record.getSickStartDate() == null ? record.getAttendanceDate() : record.getSickStartDate();
        if (start == null || date.isBefore(start)) return false;
        if (record.getSickEndDate() != null) return !date.isAfter(record.getSickEndDate());
        if ("SAKIT".equals(record.getAction())) return date.equals(start);
        LocalDate end = legacyEnd(start, record.getLeaveDays());
        return date.equals(start) || date.getDayOfWeek().getValue() < 6 && !date.isAfter(end);
    }
    public static LocalDate legacyEnd(LocalDate start, Double days) {
        int target = days == null ? 1 : Math.max(1, (int) Math.ceil(days));
        LocalDate end = start;
        int counted = start.getDayOfWeek().getValue() < 6 ? 1 : 0;
        while (counted < target) { end = end.plusDays(1); if (end.getDayOfWeek().getValue() < 6) counted++; }
        return end;
    }
}
