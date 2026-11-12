package sys.hris.sims.attendance.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import sys.hris.sims.attendance.dto.PermissionSubmitRequest;
import sys.hris.sims.attendance.entity.Attendance;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.notification.service.NotificationService;

class EarlySickPermissionTest {
    private AttendanceRepository records;
    private AttendanceService service;

    @BeforeEach
    void setup() {
        records = mock(AttendanceRepository.class);
        EmployeeRepository employees = mock(EmployeeRepository.class);
        Employee employee = new Employee();
        employee.setEmployeeId(1L);
        when(employees.findFirstByUser_Username("user")).thenReturn(Optional.of(employee));
        LeaveAttendancePolicy policy = mock(LeaveAttendancePolicy.class);
        when(policy.resolve(any(), any(), isNull())).thenReturn(LeaveAttendancePolicy.LeaveToday.NONE);
        when(records.findByEmployee_EmployeeIdAndReasonAndActionOrderByRecordedAtDesc(anyLong(), anyString(), anyString()))
                .thenReturn(List.of());
        when(records.save(any(Attendance.class))).thenAnswer(call -> call.getArgument(0));
        service = new AttendanceService(records, employees, null, null, null, null, policy,
                mock(NotificationService.class));
    }

    private PermissionSubmitRequest request(double days, boolean early) {
        PermissionSubmitRequest request = new PermissionSubmitRequest();
        request.setType("SAKIT");
        request.setNote("Sakit, harus pulang");
        request.setDays(days);
        request.setEarlyCheckout(early);
        return request;
    }

    @Test
    void halfDayWithoutMedicalDocumentPreservesCheckInSlot() {
        when(records.existsActiveByActionAndReasonIn(eq(1L), any(LocalDate.class), eq("MASUK"), eq(List.of("ABSEN"))))
                .thenReturn(true);
        var response = service.submitPermission("user", request(0.5, true));
        assertEquals(0.5, response.getLeaveDays());
        assertEquals("SAKIT", response.getAction());
        assertEquals("PENDING", response.getApprovalStatus());
        assertTrue(response.getDocumentRequired());
    }

    @Test
    void earlySickRequiresCheckIn() {
        assertThrows(IllegalStateException.class, () -> service.submitPermission("user", request(0.5, true)));
        verify(records, never()).save(any());
    }

    @Test
    void earlySickRejectsOtherDurations() {
        when(records.existsActiveByActionAndReasonIn(eq(1L), any(LocalDate.class), eq("MASUK"), eq(List.of("ABSEN"))))
                .thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.submitPermission("user", request(2, true)));
        verify(records, never()).save(any());
    }
}
