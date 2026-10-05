package sys.hris.sims.common.service;

import java.util.Locale;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;

// [BARU] Aturan "siapa boleh melihat / memutuskan pengajuan siapa" untuk
// persetujuan Lembur & Sakit. Dipakai OvertimeService dan AttendanceService
// supaya aturannya satu tempat.
//
//   - SUPER_ADMIN                : semua karyawan.
//   - LEADER / SPV / MANAGER     : hanya karyawan di DIVISI YANG SAMA dengan
//                                  jenjang LEBIH RENDAH (Member < Leader < SPV
//                                  < Manager), dan bukan pengajuan miliknya
//                                  sendiri. Pengajuan Manager hanya bisa
//                                  diputuskan SuperAdmin.
@Service
@RequiredArgsConstructor
public class ApprovalScopeService {

    private static final String ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";

    private final EmployeeRepository employeeRepository;

    // Dipanggil sekali per request, hasilnya dipakai untuk memfilter banyak baris.
    public ApprovalScope resolve(Authentication authentication) {
        boolean superAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> ROLE_SUPER_ADMIN.equals(authority.getAuthority()));
        if (superAdmin) {
            return new ApprovalScope(true, null, null, 0);
        }

        Employee approver = employeeRepository.findFirstByUser_Username(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Data karyawan tidak ditemukan untuk user ini"));
        Long divisiId = approver.getDivisi() == null ? null : approver.getDivisi().getId();
        return new ApprovalScope(false, approver.getEmployeeId(), divisiId, rankOf(approver));
    }

    public record ApprovalScope(boolean all, Long approverId, Long divisiId, int approverRank) {

        public boolean canHandle(Employee target) {
            if (all) return true;
            if (target == null || divisiId == null || target.getDivisi() == null) return false;
            if (approverId.equals(target.getEmployeeId())) return false;
            return divisiId.equals(target.getDivisi().getId()) && rankOf(target) < approverRank;
        }
    }

    private static int rankOf(Employee employee) {
        String role = employee.getUser().getRoleId().getRoleName();
        return switch (role == null ? "" : role.trim().toUpperCase(Locale.ROOT)) {
            case "LEADER" -> 1;
            case "SPV" -> 2;
            case "MANAGER" -> 3;
            default -> 0;
        };
    }
}
