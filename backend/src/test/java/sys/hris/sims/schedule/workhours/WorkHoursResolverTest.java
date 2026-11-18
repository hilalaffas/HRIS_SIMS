package sys.hris.sims.schedule.workhours;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.junit.jupiter.api.Test;

import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.entity.DivisiDaySchedule;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.shift.entity.Shift;

// [BARU] Jam kerja efektif: jam dasar Regular, jadwal khusus per hari (Jumat), dan shift.
class WorkHoursResolverTest {

    private static final LocalDate THURSDAY = LocalDate.of(2026, 9, 24);
    private static final LocalDate FRIDAY = LocalDate.of(2026, 9, 25);

    private static Employee employeeIn(Divisi division) {
        Employee employee = new Employee();
        employee.setDivisi(division);
        return employee;
    }

    private static Divisi regularDivision(String start, String end) {
        Divisi division = new Divisi();
        division.setTipeDivisi("REGULAR");
        division.setRegularStartTime(start);
        division.setRegularEndTime(end);
        return division;
    }

    private static void addFridayRule(Divisi division) {
        DivisiDaySchedule rule = new DivisiDaySchedule();
        rule.setDayOfWeek(5);
        rule.setStartTime("08:00");
        rule.setBreakStartTime("11:30");
        rule.setBreakEndTime("13:00");
        rule.setEndTime("17:30");
        rule.setDivisi(division);
        division.getDaySchedules().add(rule);
    }

    @Test
    void regularBaseHoursApplyOnNormalDays() {
        Divisi division = regularDivision("09:00", "18:00");
        WorkHours hours = WorkHoursResolver.resolve(employeeIn(division), THURSDAY, null);

        assertThat(hours.start()).isEqualTo(LocalTime.of(9, 0));
        assertThat(hours.end()).isEqualTo(LocalTime.of(18, 0));
        assertThat(hours.requiredWork()).isEqualTo(Duration.ofHours(8)); // 9 jam rentang, maksimal 8 jam
    }

    @Test
    void fridayRuleOverridesBaseHoursOnlyOnFriday() {
        Divisi division = regularDivision("08:00", "17:00");
        addFridayRule(division);
        Employee employee = employeeIn(division);

        WorkHours friday = WorkHoursResolver.resolve(employee, FRIDAY, null);
        assertThat(friday.end()).isEqualTo(LocalTime.of(17, 30));
        assertThat(friday.hasBreak()).isTrue();
        assertThat(friday.requiredWork()).isEqualTo(Duration.ofHours(8)); // 9,5 jam - 1,5 jam istirahat
        assertThat(friday.requiredAttendance()).isEqualTo(Duration.ofMinutes(570)); // [BARU] 8 jam + 1,5 jam istirahat
        assertThat(friday.endAt(FRIDAY)).isEqualTo(LocalDateTime.of(2026, 9, 25, 17, 30));

        WorkHours thursday = WorkHoursResolver.resolve(employee, THURSDAY, null);
        assertThat(thursday.end()).isEqualTo(LocalTime.of(17, 0));
        assertThat(thursday.hasBreak()).isFalse();
    }

    @Test
    void divisionWithoutConfigurationKeepsLegacyHours() {
        assertThat(WorkHoursResolver.resolve(employeeIn(null), THURSDAY, null)).isEqualTo(WorkHours.defaultRegular());
        assertThat(WorkHoursResolver.resolve(employeeIn(regularDivision(null, null)), THURSDAY, null))
                .isEqualTo(WorkHours.defaultRegular());
    }

    @Test
    void shiftingEmployeeFollowsPublishedShift() {
        Divisi division = new Divisi();
        division.setTipeDivisi("SHIFTING");
        Shift night = new Shift();
        night.setStartTime(LocalTime.of(23, 0));
        night.setEndTime(LocalTime.of(7, 0));
        WorkSchedule schedule = new WorkSchedule();
        schedule.setShift(night);

        WorkHours hours = WorkHoursResolver.resolve(employeeIn(division), THURSDAY, schedule);

        assertThat(hours.overnight()).isTrue();
        assertThat(hours.endAt(THURSDAY)).isEqualTo(LocalDateTime.of(2026, 9, 25, 7, 0));
        assertThat(hours.requiredWork()).isEqualTo(Duration.ofHours(8));
    }

    @Test
    void customShortRegularDayRequiresOnlyItsOwnSpan() {
        WorkHours hours = WorkHours.ofRegular(LocalTime.of(9, 0), LocalTime.of(13, 0), null, null);
        assertThat(hours.requiredWork()).isEqualTo(Duration.ofHours(4));
    }
}
