package sys.hris.sims.common.service;

import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;

// [UBAH] Sekarang hanya pembungkus tipis di atas HiddenAccountPolicy supaya semua pemanggil lama
// (daftar karyawan, laporan absensi/cuti, ringkasan cuti, alat dev) tidak perlu diubah.
//
// Sebelumnya: akun dev disembunyikan di mana pun, SUPER_ADMIN hanya dari laporan.
// Sekarang   : superadmin DAN dev disembunyikan di daftar karyawan MAUPUN laporan
//              (aturan identik, lihat HiddenAccountPolicy).
@Service
@RequiredArgsConstructor
public class ReportScopeService {

    private final HiddenAccountPolicy hiddenAccountPolicy;

    // Nama lama dipertahankan: kini berlaku untuk akun dev DAN superadmin.
    public boolean isDevEmployee(Employee employee) {
        return hiddenAccountPolicy.isHiddenEmployee(employee);
    }

    public boolean isExcludedFromReports(Employee employee) {
        return hiddenAccountPolicy.isHiddenEmployee(employee);
    }

    public List<Employee> withoutDevEmployees(List<Employee> employees) {
        return hiddenAccountPolicy.withoutHidden(employees);
    }

    public List<Employee> onlyReportableEmployees(List<Employee> employees) {
        return hiddenAccountPolicy.withoutHidden(employees);
    }
}
