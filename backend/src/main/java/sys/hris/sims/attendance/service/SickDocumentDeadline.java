package sys.hris.sims.attendance.service;

import java.time.LocalDate;
import sys.hris.sims.attendance.entity.Attendance;

public final class SickDocumentDeadline {
    private SickDocumentDeadline() {}
    public static LocalDate forSubmission(LocalDate date) {
        return (date.getDayOfMonth() > 20 ? date.plusMonths(1) : date).withDayOfMonth(20);
    }
    public static LocalDate deadline(Attendance attendance) {
        if (attendance.getDocumentUploadDeadline() != null) return attendance.getDocumentUploadDeadline();
        LocalDate submitted = attendance.getRecordedAt() == null ? attendance.getAttendanceDate() : attendance.getRecordedAt().toLocalDate();
        return submitted == null ? null : forSubmission(submitted);
    }
    public static boolean expired(Attendance attendance, LocalDate today) {
        LocalDate limit = deadline(attendance);
        return Boolean.TRUE.equals(attendance.getDocumentRequired()) && limit != null && today.isAfter(limit)
                && (attendance.getDocumentUrl() == null || attendance.getDocumentUrl().isBlank()
                    || "REJECTED".equals(attendance.getDocumentReviewStatus())
                    || "REJECTED".equals(attendance.getApprovalStatus()));
    }
}
