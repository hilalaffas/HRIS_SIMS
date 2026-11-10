package sys.hris.sims.devtools.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime; // [BARU]
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet; // [BARU]
import java.util.List;
import java.util.Locale; // [BARU]
import java.util.Set; // [BARU]

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import sys.hris.sims.common.service.ReportScopeService;
import sys.hris.sims.devtools.dto.DevLeaveRow;
import sys.hris.sims.devtools.dto.ImportResultResponse;
import sys.hris.sims.devtools.dto.ImportRowResult;
import sys.hris.sims.devtools.dto.UpdateLeaveRequest;
import sys.hris.sims.devtools.util.CsvUtil;
import sys.hris.sims.devtools.util.CsvUtil.CsvRow;
import sys.hris.sims.devtools.util.CsvUtil.CsvTable;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.dto.LeaveBalanceResponse;
import sys.hris.sims.leave.service.LeaveService;

// [BARU] Penyesuaian cuti dari panel /devAccess (edit per karyawan + import/export CSV).
//
// Tiga hal yang bisa diatur per karyawan:
//   1. Tanggal masuk (joinDate)  -> menggeser periode anniversary cuti tahunan.
//   2. Sisa Cuti Lama            -> employees.manual_leave_balance (MENIMPA saldo lama).
//   3. Sisa cuti tahun berjalan  -> dikonversi jadi "terpakai di luar sistem":
//        terpakaiManual = kuota periode - cuti tercatat di sistem - sisa yang diisi
//      lalu disimpan bersama awal periodenya (V55), sehingga berhenti berlaku otomatis
//      saat periode anniversary berganti.
//
// Urutan di dalam satu penyesuaian: tanggal masuk -> sisa lama -> sisa tahun berjalan
// (supaya sisa tahun berjalan dihitung terhadap periode yang BARU).
@Service
public class DevLeaveDataService {

    private static final Logger log = LoggerFactory.getLogger(DevLeaveDataService.class);

    static final List<String> HEADERS = List.of(
            "username", "nama_lengkap", "tanggal_masuk", "sisa_cuti_lama", "sisa_cuti_tahun_berjalan");

    private static final int MAX_IMPORT_ROWS = 2000;
    private static final BigDecimal MAX_BALANCE = new BigDecimal("9999.99"); // NUMERIC(6,2)
    // [BARU] Saldo BOLEH negatif (defisit cuti, sama seperti sisa cuti tahunan yang boleh minus di LeaveService).
    private static final BigDecimal MIN_BALANCE = MAX_BALANCE.negate();

    private final EmployeeRepository employeeRepository;
    private final LeaveService leaveService;
    private final ReportScopeService reportScopeService;
    private final DevAccessService devAccessService;
    private final TransactionTemplate transactionTemplate;

    public DevLeaveDataService(EmployeeRepository employeeRepository,
                               LeaveService leaveService,
                               ReportScopeService reportScopeService,
                               DevAccessService devAccessService,
                               PlatformTransactionManager transactionManager) {
        this.employeeRepository = employeeRepository;
        this.leaveService = leaveService;
        this.reportScopeService = reportScopeService;
        this.devAccessService = devAccessService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    // ============================== DAFTAR ==============================

    @Transactional(readOnly = true)
    public List<DevLeaveRow> listRows() {
        return buildRows(reportScopeService.withoutDevEmployees(employeeRepository.findAll()));
    }

    private List<DevLeaveRow> buildRows(List<Employee> employees) {
        return employees.stream()
                .sorted(Comparator.comparing(Employee::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toRow)
                .toList();
    }

    private DevLeaveRow toRow(Employee employee) {
        LeaveBalanceResponse balance = leaveService.getLeaveBalanceOf(employee);
        boolean eligible = balance.getAnnualEligibleFrom() == null;
        return new DevLeaveRow(
                employee.getEmployeeId(),
                employee.getUser().getUsername(),
                employee.getFullName(),
                employee.getJoinDate(),
                eligible,
                balance.getAnnualEligibleFrom(),
                balance.getAnnualPeriodStart(),
                balance.getAnnualPeriodEnd(),
                balance.getAnnualQuota(),
                balance.getUsedAnnualLeave(),
                balance.getAnnualUsedOutsideSystem(),
                balance.getRemainingAnnualLeave(),
                balance.getManualLeaveAllocated());
    }

    // ============================== EDIT PER KARYAWAN ==============================

    @Transactional
    public DevLeaveRow updateEmployee(Long employeeId, UpdateLeaveRequest request) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Karyawan tidak ditemukan."));
        assertNotDevAccount(employee);

        LocalDate joinDate = request.joinDate() == null || request.joinDate().isBlank()
                ? null
                : CsvUtil.parseDate(request.joinDate(), "Tanggal masuk");

        applyAdjustment(employee, joinDate, request.oldLeaveBalance(), request.currentYearRemaining());
        return toRow(employee);
    }

    // ============================== EXPORT ==============================

    @Transactional(readOnly = true)
    public String exportCsv() {
        List<List<String>> rows = new ArrayList<>();
        // [UBAH] Export tanpa superadmin & akun dev (panel edit tetap menampilkan superadmin).
        for (DevLeaveRow row : buildRows(reportScopeService.onlyReportableEmployees(employeeRepository.findAll()))) {
            rows.add(List.of(
                    CsvUtil.safeText(row.username()),
                    CsvUtil.safeText(row.fullName()),
                    row.joinDate() == null ? "" : row.joinDate().toString(),
                    row.oldLeaveBalance() == null ? "" : row.oldLeaveBalance().toPlainString(),
                    row.eligible() ? row.annualRemaining().toPlainString() : ""));
        }
        return CsvUtil.write(HEADERS, rows);
    }

    // ============================== IMPORT ==============================

    // Karyawan dicocokkan lewat username. Kolom kosong = tidak diubah; kolom terisi MENIMPA nilai lama.
    // Tiap baris punya transaksi sendiri: baris bermasalah dilewati, baris lain tetap diproses.
    // [UBAH] dryRun = true -> Pre-flight Validation: SELURUH aturan dijalankan persis seperti import
    // sungguhan (termasuk perhitungan saldo), lalu transaksi baris di-ROLLBACK sehingga tidak ada yang
    // tersimpan. Aman dilakukan di sini karena import saldo hanya mengubah kolom employees (tidak ada
    // sequence yang terpakai, berbeda dengan import karyawan).
    public ImportResultResponse importCsv(String csvText, boolean dryRun) {
        CsvTable table = CsvUtil.parse(csvText);
        if (!table.headers().contains("username")) {
            throw new IllegalArgumentException("Kolom wajib tidak ditemukan di header CSV: username");
        }
        if (table.rows().isEmpty()) {
            throw new IllegalArgumentException("File CSV tidak berisi data.");
        }
        if (table.rows().size() > MAX_IMPORT_ROWS) {
            throw new IllegalArgumentException("Maksimal " + MAX_IMPORT_ROWS + " baris per import.");
        }

        List<ImportRowResult> results = new ArrayList<>();
        Set<String> seenUsernames = new HashSet<>(); // [BARU] username ganda di file = ambigu, baris berikutnya dilewati
        for (CsvRow row : table.rows()) {
            String username = row.get("username");
            try {
                if (!username.isEmpty() && !seenUsernames.add(username.toLowerCase(Locale.ROOT))) { // [BARU]
                    throw new IllegalArgumentException("Username '" + username
                            + "' muncul lebih dari satu kali di file ini; hanya kemunculan pertama yang diproses.");
                }
                String message = transactionTemplate.execute(status -> {
                    String rowMessage = importRow(row);
                    if (dryRun) {
                        status.setRollbackOnly(); // [BARU] pratinjau: buang semua perubahan baris ini
                    }
                    return rowMessage;
                });
                results.add(ImportRowResult.success(row.number(), username,
                        dryRun ? "Cuti akan diperbarui." : message)); // [UBAH]
            } catch (IllegalArgumentException ex) {
                results.add(ImportRowResult.skipped(row.number(), username, ex.getMessage()));
            } catch (DataIntegrityViolationException ex) {
                log.warn("Import cuti baris {} ditolak database", row.number(), ex);
                results.add(ImportRowResult.skipped(row.number(), username, "Ditolak database (nilai tidak valid)."));
            } catch (RuntimeException ex) {
                log.error("Import cuti baris {} gagal", row.number(), ex);
                results.add(ImportRowResult.skipped(row.number(), username, "Gagal diproses: " + ex.getMessage()));
            }
        }
        List<String> notes = dryRun
                ? List.of("Pre-flight Validation: belum ada data yang disimpan.")
                : List.of(); // [BARU]
        return ImportResultResponse.of(results, notes);
    }

    private String importRow(CsvRow row) {
        String username = row.get("username");
        if (username.isEmpty()) {
            throw new IllegalArgumentException("Username wajib diisi.");
        }
        Employee employee = employeeRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Username '" + username + "' tidak punya data karyawan."));
        assertNotDevAccount(employee);

        LocalDate joinDate = row.get("tanggal_masuk").isEmpty()
                ? null
                : CsvUtil.parseDate(row.get("tanggal_masuk"), "Tanggal masuk");
        BigDecimal oldBalance = row.get("sisa_cuti_lama").isEmpty()
                ? null
                : CsvUtil.parseDecimal(row.get("sisa_cuti_lama"), "Sisa cuti lama");
        BigDecimal currentYear = row.get("sisa_cuti_tahun_berjalan").isEmpty()
                ? null
                : CsvUtil.parseDecimal(row.get("sisa_cuti_tahun_berjalan"), "Sisa cuti tahun berjalan");

        if (joinDate == null && oldBalance == null && currentYear == null) {
            throw new IllegalArgumentException("Tidak ada nilai yang diisi, baris dilewati.");
        }

        applyAdjustment(employee, joinDate, oldBalance, currentYear);
        return "Cuti diperbarui.";
    }

    // ============================== TOTAL SISA (ledger) ==============================

    // [BARU] Menerapkan TOTAL sisa cuti dari file ledger (satu angka) ke dua saldo sistem.
    // Harus dipanggil di dalam transaksi.
    //   - Sisa tahun berjalan sistem dipertahankan; selisihnya masuk Sisa Cuti Lama.
    //   - Bila total lebih kecil dari sisa tahun berjalan: sisa tahun berjalan diturunkan
    //     menjadi total dan Sisa Cuti Lama = 0.
    //   - Karyawan yang belum berhak cuti tahunan: seluruh total menjadi Sisa Cuti Lama.
    // Mengembalikan teks ringkas hasilnya untuk laporan import.
    public String applyTotalRemaining(Employee employee, BigDecimal total) {
        assertNotDevAccount(employee);
        validateRange(total, "Sisa cuti");

        LeaveBalanceResponse balance = leaveService.getLeaveBalanceOf(employee);
        boolean eligible = balance.getAnnualEligibleFrom() == null;
        BigDecimal annualRemaining = eligible ? balance.getRemainingAnnualLeave() : BigDecimal.ZERO;

        if (total.compareTo(annualRemaining) >= 0) {
            BigDecimal oldBalance = total.subtract(annualRemaining);
            applyAdjustment(employee, null, oldBalance, null);
            return "total " + total.toPlainString() + " = sisa lama " + oldBalance.toPlainString()
                    + " + sisa tahun berjalan " + annualRemaining.toPlainString();
        }

        // [BARU] Total negatif pada karyawan yang belum berhak cuti tahunan: tidak ada sisa tahun berjalan
        // yang bisa diturunkan, jadi defisit dicatat di Sisa Cuti Lama.
        if (!eligible) {
            applyAdjustment(employee, null, total, null);
            return "total " + total.toPlainString() + " = sisa lama " + total.toPlainString()
                    + " (belum berhak cuti tahunan)";
        }

        applyAdjustment(employee, null, BigDecimal.ZERO, total);
        return "total " + total.toPlainString() + " = sisa tahun berjalan " + total.toPlainString()
                + " (sisa lama 0)";
    }

    // ============================== [BARU] SALDO HASIL HITUNG IMPORT ==============================

    // Menerapkan Sisa Cuti Lama + sisa tahun berjalan hasil hitung otomatis import riwayat (menimpa, bukan
    // menambah, sehingga import ulang menghasilkan angka yang sama). Harus dipanggil di dalam transaksi.
    // Nilai divalidasi lebih dulu: bila melempar IllegalArgumentException, belum ada yang diubah.
    public void applyImportBalances(Employee employee, BigDecimal oldBalance, BigDecimal currentYearRemaining) {
        assertNotDevAccount(employee);
        validateRange(oldBalance, "Sisa cuti lama");
        validateRange(currentYearRemaining, "Sisa cuti tahun berjalan");
        if (currentYearRemaining != null) {
            adjustCurrentYear(employee, currentYearRemaining); // memvalidasi dulu, baru mengubah
        }
        if (oldBalance != null) {
            employee.setManualLeaveBalance(oldBalance.setScale(2, RoundingMode.HALF_UP));
        }
        employeeRepository.saveAndFlush(employee);
    }

    // ============================== [BARU] ANGKA EXCEL APA ADANYA ==============================

    // Menyimpan angka cuti dari Excel APA ADANYA (terpakai, hangus, sisa; total = sisa + terpakai + hangus)
    // dan menyamakan saldo sistem dengan sisa di Excel. Harus dipanggil di dalam transaksi.
    // Validasi dulu: bila melempar IllegalArgumentException, belum ada yang diubah.
    // Cuti baru yang disetujui setelah baselineAt dihitung logika sistem di atas angka ini
    // (lihat LeaveSummaryService.summarize).
    public String applyExcelBaseline(Employee employee, BigDecimal used, BigDecimal forfeited,
                                     BigDecimal remaining, LocalDateTime baselineAt) {
        assertNotDevAccount(employee);
        BigDecimal total = remaining.add(used).add(forfeited);
        validateRange(used, "Cuti terpakai");
        validateRange(forfeited, "Cuti hangus");
        validateRange(total, "Total cuti");

        String balanceText = applyTotalRemaining(employee, remaining); // memvalidasi sisa & menimpa saldo

        employee.setImportTotalLeave(total.setScale(2, RoundingMode.HALF_UP));
        employee.setImportUsedLeave(used.setScale(2, RoundingMode.HALF_UP));
        employee.setImportForfeitedLeave(forfeited.setScale(2, RoundingMode.HALF_UP));
        employee.setImportRemainingLeave(remaining.setScale(2, RoundingMode.HALF_UP));
        employee.setLeaveImportBaselineAt(baselineAt);
        employeeRepository.saveAndFlush(employee);
        return balanceText;
    }

    // ============================== INTI PENYESUAIAN ==============================

    // Harus dipanggil di dalam transaksi. Melempar IllegalArgumentException bila nilai tidak masuk akal.
    private void applyAdjustment(Employee employee,
                                 LocalDate newJoinDate,
                                 BigDecimal oldBalance,
                                 BigDecimal currentYearRemaining) {
        // Validasi nilai dulu, sebelum ada yang diubah.
        validateRange(oldBalance, "Sisa cuti lama");
        validateRange(currentYearRemaining, "Sisa cuti tahun berjalan");

        if (newJoinDate != null && !newJoinDate.equals(employee.getJoinDate())) {
            employee.setJoinDate(newJoinDate);
            // Periode bergeser -> penyesuaian lama tidak berlaku lagi (tidak cocok dengan periode baru).
            employee.setAnnualUsedOutsideSystem(BigDecimal.ZERO);
            employee.setAnnualUsedOutsidePeriodStart(null);
            employeeRepository.saveAndFlush(employee);
        }

        if (oldBalance != null) {
            employee.setManualLeaveBalance(oldBalance.setScale(2, RoundingMode.HALF_UP));
        }

        if (currentYearRemaining != null) {
            adjustCurrentYear(employee, currentYearRemaining);
        }

        employeeRepository.saveAndFlush(employee);
    }

    private void adjustCurrentYear(Employee employee, BigDecimal target) {
        LeaveBalanceResponse balance = leaveService.getLeaveBalanceOf(employee);

        if (balance.getAnnualEligibleFrom() != null) {
            // Belum berhak cuti tahunan: hanya boleh kosong / 0.
            if (target.signum() != 0) {
                throw new IllegalArgumentException("Karyawan belum berhak cuti tahunan (berhak mulai "
                        + balance.getAnnualEligibleFrom() + "). Kosongkan sisa cuti tahun berjalan.");
            }
            return;
        }

        if (target.compareTo(balance.getAnnualQuota()) > 0) {
            throw new IllegalArgumentException("Sisa cuti tahun berjalan (" + target.toPlainString()
                    + ") melebihi kuota periode ini (" + balance.getAnnualQuota().toPlainString() + ").");
        }

        // sisa sekarang = kuota - (terpakaiDiSistem + terpakaiManualLama)
        // sisa target   = kuota - (terpakaiDiSistem + terpakaiManualBaru)
        BigDecimal newUsedOutside = balance.getAnnualUsedOutsideSystem()
                .add(balance.getRemainingAnnualLeave())
                .subtract(target);

        if (newUsedOutside.signum() < 0) {
            BigDecimal usedInSystem = balance.getUsedAnnualLeave().subtract(balance.getAnnualUsedOutsideSystem());
            throw new IllegalArgumentException("Sisa cuti tahun berjalan (" + target.toPlainString()
                    + ") lebih besar dari saldo yang mungkin: kuota " + balance.getAnnualQuota().toPlainString()
                    + " dikurangi cuti yang sudah tercatat di sistem " + usedInSystem.toPlainString() + ".");
        }

        employee.setAnnualUsedOutsideSystem(newUsedOutside.setScale(2, RoundingMode.HALF_UP));
        employee.setAnnualUsedOutsidePeriodStart(balance.getAnnualPeriodStart());
    }

    private void validateRange(BigDecimal value, String label) {
        if (value == null) {
            return;
        }
        // [UBAH] Nilai negatif sekarang diizinkan (defisit); hanya dibatasi kapasitas kolom NUMERIC(6,2).
        if (value.compareTo(MIN_BALANCE) < 0) {
            throw new IllegalArgumentException(label + " terlalu kecil (minimal " + MIN_BALANCE.toPlainString() + ").");
        }
        if (value.compareTo(MAX_BALANCE) > 0) {
            throw new IllegalArgumentException(label + " terlalu besar (maksimal " + MAX_BALANCE.toPlainString() + ").");
        }
    }

    private void assertNotDevAccount(Employee employee) {
        if (devAccessService.isDevAccount(employee.getUser().getUsername())) {
            throw new IllegalArgumentException("Akun dev tidak punya saldo cuti.");
        }
    }
}
