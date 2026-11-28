package sys.hris.sims.attendance.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.holiday.repository.HolidayRepository;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;
import sys.hris.sims.shift.entity.Shift;

// [BARU] Hari libur / OFF mengalahkan cuti: cuti 27-30 Nov 2026 yang melewati Sabtu 28 Nov
// tidak boleh membuat hari itu berstatus cuti (FULL_DAY), dan absen di hari libur tidak
// ikut terhapus saat cuti disetujui.
class LeaveAttendancePolicyNonWorkingDayTest {

    private static final LocalDate FRIDAY = LocalDate.of(2026, 11, 27);
    private static final LocalDate SATURDAY = LocalDate.of(2026, 11, 28);
    private static final LocalDate SUNDAY = LocalDate.of(2026, 11, 29);
    private static final LocalDate MONDAY = LocalDate.of(2026, 11, 30);

    private final LeaveRepository leaves = mock(LeaveRepository.class);
    private final AttendanceRepository attendances = mock(AttendanceRepository.class);
    private final WorkScheduleRepository schedules = mock(WorkScheduleRepository.class);
    private final HolidayRepository holidays = mock(HolidayRepository.class);
    private final LeaveAttendancePolicy policy =
            new LeaveAttendancePolicy(leaves, attendances, schedules, holidays);

    private Employee employee(String divisionType) {
        Divisi divisi = new Divisi();
        divisi.setTipeDivisi(divisionType);
        Employee employee = new Employee();
        employee.setEmployeeId(1L);
        employee.setDivisi(divisi);
        return employee;
    }

    private LeaveRequest approvedLeave(Employee employee) {
        return LeaveRequest.builder().employee(employee).startDate(FRIDAY).endDate(MONDAY).build();
    }

    private void leaveCovers(Employee employee, LocalDate... dates) {
        LeaveRequest leave = approvedLeave(employee);
        for (LocalDate date : dates) {
            when(leaves.findApprovedCovering(1L, date)).thenReturn(List.of(leave));
        }
    }

    @Test
    void regularWorkdayWithApprovedLeaveIsFullDayLeave() {
        Employee employee = employee("REGULAR");
        leaveCovers(employee, FRIDAY);

        assertEquals(LeaveAttendancePolicy.Mode.FULL_DAY, policy.resolve(employee, FRIDAY, null).mode());
    }

    @Test
    void regularSaturdayAndSundayInsideLeaveRangeAreNotLeave() {
        Employee employee = employee("REGULAR");
        leaveCovers(employee, SATURDAY, SUNDAY);

        assertEquals(LeaveAttendancePolicy.Mode.NONE, policy.resolve(employee, SATURDAY, null).mode());
        assertEquals(LeaveAttendancePolicy.Mode.NONE, policy.resolve(employee, SUNDAY, null).mode());
    }

    @Test
    void regularNationalHolidayOnWeekdayInsideLeaveRangeIsNotLeave() {
        Employee employee = employee("REGULAR");
        leaveCovers(employee, MONDAY);
        when(holidays.existsByDate(MONDAY)).thenReturn(true);

        assertEquals(LeaveAttendancePolicy.Mode.NONE, policy.resolve(employee, MONDAY, null).mode());
    }

    @Test
    void shiftingOffDayInsideLeaveRangeIsNotLeave() {
        Employee employee = employee("SHIFTING");
        leaveCovers(employee, SATURDAY);
        WorkSchedule offDay = new WorkSchedule(); // baris jadwal ada, tanpa shift = OFF

        assertEquals(LeaveAttendancePolicy.Mode.NONE, policy.resolve(employee, SATURDAY, offDay).mode());
    }

    @Test
    void shiftingOffDayIsFoundFromRepositoryWhenScheduleNotGiven() {
        Employee employee = employee("SHIFTING");
        leaveCovers(employee, SATURDAY);
        when(schedules.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(1L, SATURDAY, SATURDAY))
                .thenReturn(List.of(new WorkSchedule()));

        assertEquals(LeaveAttendancePolicy.Mode.NONE, policy.resolve(employee, SATURDAY, null).mode());
    }

    @Test
    void shiftingWorkingDayWithApprovedLeaveIsFullDayLeave() {
        Employee employee = employee("SHIFTING");
        leaveCovers(employee, FRIDAY);
        WorkSchedule workingDay = new WorkSchedule();
        workingDay.setShift(mock(Shift.class));

        assertEquals(LeaveAttendancePolicy.Mode.FULL_DAY, policy.resolve(employee, FRIDAY, workingDay).mode());
    }

    @Test
    void shiftingWithoutPublishedScheduleKeepsLeaveBehaviour() {
        Employee employee = employee("SHIFTING");
        leaveCovers(employee, FRIDAY);
        when(schedules.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(1L, FRIDAY, FRIDAY))
                .thenReturn(List.of());

        assertEquals(LeaveAttendancePolicy.Mode.FULL_DAY, policy.resolve(employee, FRIDAY, null).mode());
    }

    @Test
    void approvingLeaveOnlyClearsAttendanceOnWorkingDays() {
        Employee employee = employee("REGULAR");
        LeaveRequest leave = approvedLeave(employee);

        policy.reconcileOnApproval(leave);

        verify(attendances).deleteAbsenInRange(1L, FRIDAY, FRIDAY);
        verify(attendances).deleteAbsenInRange(1L, MONDAY, MONDAY);
        verify(attendances, never()).deleteAbsenInRange(1L, SATURDAY, SATURDAY);
        verify(attendances, never()).deleteAbsenInRange(1L, SUNDAY, SUNDAY);
    }
}
