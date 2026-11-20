package sys.hris.sims.common.service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;

// [BARU] SATU-SATUNYA tempat yang menentukan "siapa boleh jadi approver tahap X dan tahap mana yang boleh
// dikosongkan". Dipakai Cuti, Lembur, dan Koreksi Absensi supaya dropdown dan validasi server selalu sama.
// Tahap HRD TIDAK lewat sini (tetap diatur HrdApproverPolicy).
//
//   Tahap     Divisi approver                         Boleh dikosongkan ("-")
//   --------  --------------------------------------  -----------------------
//   LEADER    harus satu divisi dengan pemohon        ya  (tahap dilewati)
//   SPV       harus satu divisi dengan pemohon        ya  (tahap dilewati)
//   MANAGER   Manager terdaftar dari divisi mana pun  tidak (selalu wajib)
@Component
@RequiredArgsConstructor
public class ApproverScopePolicy {

    public static final String STAGE_LEADER = "LEADER";
    public static final String STAGE_SPV = "SPV";
    public static final String STAGE_MANAGER = "MANAGER";

    private static final Set<String> OPTIONAL_STAGES = Set.of(STAGE_LEADER, STAGE_SPV);

    private final EmployeeRepository employeeRepository;
    private final ReportScopeService reportScopeService; // akun tersembunyi (superadmin & dev) tidak jadi pilihan

    // Tahap yang boleh dikosongkan pemohon: tidak ada pilihan = tahap dilewati.
    public static boolean isOptionalStage(String stage) {
        return OPTIONAL_STAGES.contains(normalize(stage));
    }

    // Dipakai validasi di server (jangan percaya dropdown frontend).
    public boolean allowsApprover(Employee requester, Employee approver, String stage) {
        if (STAGE_MANAGER.equals(normalize(stage))) {
            return true; // Manager boleh dari divisi mana pun
        }
        Long requesterDivisi = divisiIdOf(requester);
        return requesterDivisi != null && requesterDivisi.equals(divisiIdOf(approver));
    }

    // Pilihan approver untuk satu tahap. Urutan: divisi sendiri dulu, lalu per nama divisi, lalu nama.
    public List<Employee> selectableApprovers(Employee requester, String stage) {
        String normalizedStage = normalize(stage);
        Long ownDivisi = divisiIdOf(requester);
        // [UBAH] Manager: satu query lintas divisi. Leader/SPV: disaring di database ke divisi pemohon
        // (bukan memuat semua divisi lalu menyaring di memori).
        List<Employee> pool;
        if (STAGE_MANAGER.equals(normalizedStage)) {
            pool = employeeRepository.findActiveByRoleNamesUpper(Set.of(normalizedStage));
        } else if (ownDivisi == null) {
            pool = List.of();
        } else {
            pool = employeeRepository.findActiveByRoleNameUpperAndDivisiId(normalizedStage, ownDivisi);
        }
        return pool.stream()
                .filter(employee -> !reportScopeService.isExcludedFromReports(employee))
                .filter(employee -> divisiIdOf(employee) != null)
                .filter(employee -> !Objects.equals(employee.getEmployeeId(), requester.getEmployeeId()))
                .filter(employee -> allowsApprover(requester, employee, normalizedStage))
                .sorted(Comparator
                        .comparing((Employee employee) -> !Objects.equals(divisiIdOf(employee), ownDivisi))
                        .thenComparing(employee -> String.valueOf(employee.getDivisi().getNamaDivisi()))
                        .thenComparing(employee -> String.valueOf(employee.getFullName())))
                .toList();
    }

    private static Long divisiIdOf(Employee employee) {
        return employee == null || employee.getDivisi() == null ? null : employee.getDivisi().getId();
    }

    private static String normalize(String stage) {
        return stage == null ? "" : stage.trim().toUpperCase(Locale.ROOT);
    }
}
