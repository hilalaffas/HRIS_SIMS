package sys.hris.sims.common.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.devtools.service.DevAccessService;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.user.entity.User;

// [BARU] Satu-satunya tempat yang menentukan akun mana yang disembunyikan.
//   - Akun DEV (role DEV / username dari env DEV_ACCESS_USERNAME, mis. supersecret):
//     disembunyikan DI MANA PUN (daftar karyawan, pemilihan karyawan, laporan).
//   - Akun SUPER_ADMIN: hanya disembunyikan dari LAPORAN.
@Service
@RequiredArgsConstructor
public class ReportScopeService {

    private static final String ROLE_DEV = "DEV";
    private static final Set<String> REPORT_EXCLUDED_ROLE_NAMES =
            Set.of(ROLE_DEV, "SUPER_ADMIN", "SUPERADMIN");

    private final DevAccessService devAccessService;

    // Akun dev: role DEV atau username-nya cocok dengan DEV_ACCESS_USERNAME.
    public boolean isDevEmployee(Employee employee) {
        User user = employee == null ? null : employee.getUser();
        if (user == null) {
            return false;
        }
        return devAccessService.isDevAccount(user.getUsername())
                || ROLE_DEV.equals(roleNameOf(user));
    }

    // Dikecualikan dari laporan: akun dev + SUPER_ADMIN.
    public boolean isExcludedFromReports(Employee employee) {
        User user = employee == null ? null : employee.getUser();
        if (user == null) {
            return false;
        }
        return devAccessService.isDevAccount(user.getUsername())
                || REPORT_EXCLUDED_ROLE_NAMES.contains(roleNameOf(user));
    }

    public List<Employee> withoutDevEmployees(List<Employee> employees) {
        return employees.stream()
                .filter(employee -> !isDevEmployee(employee))
                .toList();
    }

    public List<Employee> onlyReportableEmployees(List<Employee> employees) {
        return employees.stream()
                .filter(employee -> !isExcludedFromReports(employee))
                .toList();
    }

    private String roleNameOf(User user) {
        String roleName = user.getRoleId() == null ? null : user.getRoleId().getRoleName();
        return roleName == null ? "" : roleName.trim().toUpperCase(Locale.ROOT);
    }
}
