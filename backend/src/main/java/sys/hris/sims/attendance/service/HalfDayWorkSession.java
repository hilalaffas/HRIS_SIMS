package sys.hris.sims.attendance.service;

import java.time.*;
import sys.hris.sims.schedule.workhours.WorkHours;

public record HalfDayWorkSession(LocalDateTime start, LocalDateTime end) {
    public long minutes() { return Duration.between(start,end).toMinutes(); }
    public static HalfDayWorkSession resolve(WorkHours hours, LocalDate date, boolean leaveInAfternoon) {
        LocalDateTime start=hours.startAt(date), end=hours.endAt(date);
        LocalDateTime morningEnd, afternoonStart;
        if (hours.hasBreak()) {
            morningEnd=date.atTime(hours.breakStart());
            if (morningEnd.isBefore(start)) morningEnd=morningEnd.plusDays(1);
            afternoonStart=date.atTime(hours.breakEnd());
            if (afternoonStart.isBefore(morningEnd)) afternoonStart=afternoonStart.plusDays(1);
        } else {
            // Regular default 08–17 has 8 net hours: 08–12 and 13–17.
            Duration span=Duration.between(start,end);
            Duration working=hours.requiredWork().compareTo(span)<0 ? hours.requiredWork() : span;
            morningEnd=start.plusSeconds(working.toSeconds()/2);
            afternoonStart=morningEnd.plus(span.minus(working));
        }
        return leaveInAfternoon ? new HalfDayWorkSession(start,morningEnd) : new HalfDayWorkSession(afternoonStart,end);
    }
}
