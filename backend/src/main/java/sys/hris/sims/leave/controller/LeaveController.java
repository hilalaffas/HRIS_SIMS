package sys.hris.sims.leave.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.dto.LeaveActionRequest;
import sys.hris.sims.leave.dto.LeaveApprovalResponse;
import sys.hris.sims.leave.dto.LeaveBalanceResponse;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.service.LeaveService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

@RestController
@RequestMapping("/api/cuti")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService cutiService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    // helper method ambil userId dari token
    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    // GET riwayat cuti milik user yang sedang login
    @GetMapping("/me")
    public ResponseEntity<List<LeaveRequest>> getMyCutiHistory(Authentication authentication, HttpServletRequest httpRequest) {

        Employee employee = employeeRepository.findFirstByUser_Username(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Data karyawan tidak ditemukan untuk user ini"));

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_MY_CUTI", "leave_requests", employee.getEmployeeId(), "Melihat riwayat cuti sendiri", httpRequest);

        return ResponseEntity.ok(cutiService.getCutiByKaryawan(employee.getEmployeeId()));
    }

    // GET semua cuti
    @GetMapping
    public ResponseEntity<List<LeaveRequest>> getAllCuti(Authentication authentication, HttpServletRequest httpRequest) {

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_ALL_CUTI", "leave_requests", null, "Melihat semua data cuti", httpRequest);

        return ResponseEntity.ok(cutiService.getAllCuti());
    }

    // GET cuti by ID
    @GetMapping("/{id}")
    public ResponseEntity<LeaveRequest> getCutiById(@PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_CUTI", "leave_requests", id, "Melihat detail cuti id: " + id, httpRequest);
        return ResponseEntity.ok(cutiService.getCutiById(id));
    }

    // GET cuti by karyawan
    @GetMapping("/karyawan/{idKaryawan}")
    public ResponseEntity<List<LeaveRequest>> getCutiByKaryawan(@PathVariable Long idKaryawan, Authentication authentication, HttpServletRequest httpRequest) {

        // catat activity log
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "GET_CUTI_BY_KARYAWAN", "leave_requests", idKaryawan, "Melihat data cuti karyawan id: " + idKaryawan, httpRequest);
        
        return ResponseEntity.ok(cutiService.getCutiByKaryawan(idKaryawan));
    }

    // GET total sisa cuti tahunan user yang sedang login
    @GetMapping("/balance/me")
    public ResponseEntity<LeaveBalanceResponse> getMyLeaveBalance(Authentication authentication) {
        return ResponseEntity.ok(cutiService.getMyLeaveBalance(authentication.getName()));
    }

    // GET cuti yang perlu diproses oleh role atasan yang sedang login
    @GetMapping("/approvals/my-task")
    public ResponseEntity<List<LeaveApprovalResponse>> getMyApprovalTasks(Authentication authentication) {
        return ResponseEntity.ok(cutiService.getApprovalTasks(authentication.getName()));
    }

    // GET riwayat/list cuti yang terkait dengan role atasan yang sedang login
    @GetMapping("/approvals/history")
    public ResponseEntity<List<LeaveApprovalResponse>> getMyApprovalHistory(
            Authentication authentication,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(cutiService.getApprovalHistory(authentication.getName(), status));
    }

    @GetMapping("/calendar")
    public ResponseEntity<List<LeaveRequest>> getCalendarLeaves(@RequestParam int year) {
        return ResponseEntity.ok(cutiService.getCalendarLeaves(year));
    }

    // POST ajukan cuti baru
    @PostMapping
    public ResponseEntity<LeaveRequest> createCuti(@RequestBody LeaveRequest cuti, Authentication authentication, HttpServletRequest httpRequest) {

        // catat activity log
        LeaveRequest saved = cutiService.createCuti(cuti, authentication.getName());
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "CREATE_CUTI", "leave_requests", saved.getLeaveRequestId(), "Mengajukan cuti", httpRequest);

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/resubmit")
    public ResponseEntity<LeaveRequest> resubmitCuti(
            @PathVariable Long id,
            @RequestBody LeaveRequest cuti,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        LeaveRequest saved = cutiService.resubmitCuti(id, cuti, authentication.getName());
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "RESUBMIT_CUTI", "leave_requests", id, "Memperbaiki dan mengajukan ulang cuti", httpRequest);
        return ResponseEntity.ok(saved);
    }

    // PUT approve cuti
    @PutMapping("/{id}/approve")
    public ResponseEntity<LeaveRequest> approveCuti(
            @PathVariable Long id,
            Authentication authentication,
            @RequestBody(required = false) LeaveActionRequest request,
            HttpServletRequest httpRequest) {
        String note = request == null ? null : request.getNote();

        // catat activity log        
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "APPROVE_CUTI", "leave_requests", id, "Menyetujui cuti id: " + id, httpRequest);

        return ResponseEntity.ok(cutiService.approveCuti(id, authentication.getName(), note));
    }

    // PUT reject cuti
    @PutMapping("/{id}/reject")
    public ResponseEntity<LeaveRequest> rejectCuti(
            @PathVariable Long id,
            Authentication authentication,
            @RequestBody(required = false) LeaveActionRequest request,
            HttpServletRequest httpRequest) {
        String note = request == null ? null : request.getNote();

        // catat activity log 
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "REJECT_CUTI", "leave_requests", id, "Menolak cuti id: " + id + (note != null ? " | note: " + note : ""), httpRequest);

        return ResponseEntity.ok(cutiService.rejectCuti(id, authentication.getName(), note));
    }

    // PUT return/revisi cuti
    @PutMapping("/{id}/return")
    public ResponseEntity<LeaveRequest> returnCuti(
            @PathVariable Long id,
            Authentication authentication,
            @RequestBody(required = false) LeaveActionRequest request,
            HttpServletRequest httpRequest) {
        String note = request == null ? null : request.getNote();

        // catat activity log 
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "RETURN_CUTI", "leave_requests", id, "Mengembalikan cuti id: " + id + (note != null ? " | note: " + note : ""), httpRequest);
        
        return ResponseEntity.ok(cutiService.returnCuti(id, authentication.getName(), note));

    }

    // DELETE cuti
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteCuti(@PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
        cutiService.deleteCuti(id);

        // catat activity log 
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication), "DELETE_CUTI", "leave_requests", id,"Menghapus cuti id: " + id, httpRequest);

        return ResponseEntity.ok("Cuti berhasil dihapus");
    }
}
