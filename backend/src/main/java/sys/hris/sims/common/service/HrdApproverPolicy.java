package sys.hris.sims.common.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;

// [BARU] Satu-satunya tempat aturan "pengajuan hanya boleh disetujui rekan ber-role HRD".
// Dipakai Cuti, Lembur, Koreksi Terlambat, dan Sakit & Izin supaya aturannya tidak tersebar.
//
//   - Role HRD = HRD_ADMIN dan HRD_KARYAWAN.
//   - Approver dipilih pemohon (satu nama), boleh dari divisi mana pun.
//   - Pemohon tidak boleh menjadi approver pengajuannya sendiri (dicek saat memilih DAN saat memutuskan).
@Component
@RequiredArgsConstructor
public class HrdApproverPolicy {

    // Nilai kolom approver_role untuk tahap persetujuan HRD (baris lama tetap LEADER/SPV/MANAGER).
    public static final String STAGE_ROLE = "HRD";

    public static final Set<String> HRD_ROLE_NAMES = Set.of("HRD_ADMIN", "HRD_KARYAWAN");
    private static final Set<String> HRD_AUTHORITIES = Set.of("ROLE_HRD_ADMIN", "ROLE_HRD_KARYAWAN");

    private final EmployeeRepository employeeRepository;

    public static boolean isHrdRoleName(String roleName) {
        if (roleName == null) return false;
        return HRD_ROLE_NAMES.contains(roleName.trim().toUpperCase(Locale.ROOT).replace("ROLE_", ""));
    }

    public static boolean isHrd(Employee employee) {
        return employee != null
                && employee.getUser() != null
                && employee.getUser().getRoleId() != null
                && isHrdRoleName(employee.getUser().getRoleId().getRoleName());
    }

    public static boolean hasHrdAuthority(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> HRD_AUTHORITIES.contains(authority.getAuthority()));
    }

    // Daftar nama yang boleh dipilih pemohon: HRD aktif, kecuali pemohon sendiri.
    @Transactional(readOnly = true)
    public List<Employee> findSelectableApprovers(Employee requester) {
        return employeeRepository.findActiveByRoleNamesUpper(HRD_ROLE_NAMES).stream()
                .filter(employee -> !employee.getEmployeeId().equals(requester.getEmployeeId()))
                .toList();
    }

    // Validasi di server (jangan percaya dropdown frontend).
    public Employee requireSelectableApprover(Long approverEmployeeId, Employee requester) {
        if (approverEmployeeId == null || approverEmployeeId <= 0) {
            throw new IllegalArgumentException("Approver HRD wajib dipilih.");
        }
        Employee approver = employeeRepository.findById(approverEmployeeId)
                .orElseThrow(() -> new IllegalArgumentException("Approver HRD tidak ditemukan."));
        if (!isHrd(approver)) {
            throw new IllegalArgumentException("Approver harus memiliki role HRD.");
        }
        if (!Boolean.TRUE.equals(approver.getIsActive())) {
            throw new IllegalArgumentException("Approver HRD sudah tidak aktif.");
        }
        if (approver.getEmployeeId().equals(requester.getEmployeeId())) {
            throw new IllegalArgumentException("Anda tidak dapat memilih diri sendiri sebagai approver.");
        }
        return approver;
    }

    // Lapisan kedua saat memutuskan: pemilik pengajuan tidak boleh memprosesnya.
    public void assertNotOwnRequest(Employee actor, Employee owner) {
        if (actor != null && owner != null && actor.getEmployeeId().equals(owner.getEmployeeId())) {
            throw new IllegalStateException("Anda tidak dapat memproses pengajuan milik sendiri.");
        }
    }
}
