package sys.hris.sims.devtools.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sys.hris.sims.common.service.ReportScopeService;
import sys.hris.sims.devtools.dto.DevLeaveUsedRow;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.dto.LeaveSummaryResponse;
import sys.hris.sims.leave.service.LeaveSummaryService;

// [BARU] Edit angka "Terpakai" pada Ringkasan Cuti dari panel /devAccess.
//
// Aturan (sengaja sempit supaya tidak mengganggu fungsi lain):
//   - Hanya karyawan yang SUDAH punya angka import Excel (employee.hasLeaveImportBaseline()).
//     Angka Terpakai mereka memang tersimpan (import_used_leave) -- edit ini cuma mengganti angka itu.
//     Karyawan lain: Terpakai dihitung dari riwayat cuti, jadi tidak bisa diedit (ditolak).
//   - Yang diubah HANYA satu kolom employees: import_used_leave.
//     Total Keseluruhan, Hangus, saldo cuti (sisa lama / sisa tahun berjalan), riwayat cuti, dan waktu
//     baseline TIDAK disentuh -> Dashboard, Direktori Karyawan, dan pengajuan cuti tidak berubah.
//   - Selisih Data = Total Tersedia - (Total - Terpakai - Hangus), jadi mengubah Terpakai langsung
//     mengubah selisih. Contoh: selisih +1, Terpakai 54 -> 53 => selisih 0.
//   - Terpakai tidak boleh lebih kecil dari cuti yang disetujui setelah import (angka itu dihitung
//     sistem dan akan muncul lagi), dan tidak boleh negatif.
// Import ulang riwayat cuti (ledger) menimpa hasil edit ini, sama seperti angka Excel lainnya.
@Service
public class DevLeaveUsedService {

    private static final BigDecimal MAX_VALUE = new BigDecimal("9999.99"); // NUMERIC(6,2)

    private final EmployeeRepository employeeRepository;
    private final LeaveSummaryService leaveSummaryService;
    private final ReportScopeService reportScopeService;
    private final DevAccessService devAccessService;

    public DevLeaveUsedService(EmployeeRepository employeeRepository,
                               LeaveSummaryService leaveSummaryService,
                               ReportScopeService reportScopeService,
                               DevAccessService devAccessService) {
        this.employeeRepository = employeeRepository;
        this.leaveSummaryService = leaveSummaryService;
        this.reportScopeService = reportScopeService;
        this.devAccessService = devAccessService;
    }

    // ============================== DAFTAR ==============================

    @Transactional(readOnly = true)
    public List<DevLeaveUsedRow> listRows() {
        // Daftar karyawan sama dengan Ringkasan Cuti (tanpa superadmin & akun dev).
        Map<Long, Employee> employeesById = reportScopeService
                .onlyReportableEmployees(employeeRepository.findAllWithRelations()).stream()
                .collect(Collectors.toMap(Employee::getEmployeeId, Function.identity(), (first, second) -> first));
        return leaveSummaryService.getAllSummaries().stream()
                .filter(summary -> employeesById.containsKey(summary.getEmployeeId()))
                .map(summary -> toRow(summary, employeesById.get(summary.getEmployeeId())))
                .toList();
    }

    // ============================== EDIT ==============================

    @Transactional
    public DevLeaveUsedRow updateUsed(Long employeeId, BigDecimal requestedUsed) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Karyawan tidak ditemukan."));
        if (devAccessService.isDevAccount(employee.getUser().getUsername())
                || reportScopeService.isExcludedFromReports(employee)) {
            throw new IllegalArgumentException("Akun ini tidak punya data Ringkasan Cuti.");
        }
        if (!employee.hasLeaveImportBaseline()) {
            throw new IllegalArgumentException("Terpakai hanya bisa diedit untuk karyawan yang sudah memakai angka "
                    + "import Excel. Import riwayat cuti karyawan ini lebih dulu.");
        }
        if (requestedUsed == null) {
            throw new IllegalArgumentException("Terpakai wajib diisi.");
        }

        BigDecimal target = requestedUsed.setScale(2, RoundingMode.HALF_UP);
        LeaveSummaryResponse current = leaveSummaryService.summarize(employee, leaveSummaryService.today());

        BigDecimal currentUsed = nonNull(current.getUsedLeave());
        BigDecimal importUsed = nonNull(employee.getImportUsedLeave());
        BigDecimal minUsed = currentUsed.subtract(importUsed); // cuti disetujui setelah import

        if (target.compareTo(minUsed) < 0) {
            throw new IllegalArgumentException("Terpakai tidak boleh kurang dari " + minUsed.toPlainString()
                    + " (cuti yang sudah disetujui setelah import).");
        }
        BigDecimal newImportUsed = importUsed.add(target.subtract(currentUsed));
        if (target.compareTo(MAX_VALUE) > 0) {
            throw new IllegalArgumentException("Terpakai terlalu besar (maksimal " + MAX_VALUE.toPlainString() + ").");
        }

        employee.setImportUsedLeave(newImportUsed.setScale(2, RoundingMode.HALF_UP));
        employeeRepository.saveAndFlush(employee);

        return toRow(leaveSummaryService.summarize(employee, leaveSummaryService.today()), employee);
    }

    // ============================== PEMETAAN ==============================

    private DevLeaveUsedRow toRow(LeaveSummaryResponse summary, Employee employee) {
        boolean editable = employee.hasLeaveImportBaseline();
        BigDecimal used = nonNull(summary.getUsedLeave());
        BigDecimal minUsed = editable ? used.subtract(nonNull(employee.getImportUsedLeave())) : null;
        return new DevLeaveUsedRow(
                summary.getEmployeeId(),
                summary.getEmployeeName(),
                summary.getNik(),
                editable,
                summary.getTotalOverallLeave(),
                used,
                minUsed,
                summary.getForfeitedLeave(),
                summary.getTotalAvailableLeave(),
                summary.getReconcileDifference(),
                summary.getReconcileStatus());
    }

    private static BigDecimal nonNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
