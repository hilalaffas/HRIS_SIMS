package sys.hris.sims.devtools.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import sys.hris.sims.common.service.ReportScopeService;
import sys.hris.sims.devtools.dto.ImportResultResponse;
import sys.hris.sims.devtools.dto.ImportRowResult;
import sys.hris.sims.devtools.util.LeaveLedgerCsv;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.Block;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.DayUsage;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.EntryStatus;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.ExportEmployee;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.Ledger;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.ResolvedEntry;
import sys.hris.sims.devtools.util.LeaveLedgerXlsx; // [BARU]
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.dto.LeaveBalanceResponse;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.leave.service.LeaveForfeitCalculator.Forfeit; // [BARU]
import sys.hris.sims.leave.service.LeaveService;
import sys.hris.sims.leave.service.LeaveSummaryService; // [BARU]
import sys.hris.sims.leavestatus.entity.LeaveStatus;
import sys.hris.sims.leavestatus.repository.LeaveStatusRepository;
import sys.hris.sims.leavetype.entity.LeaveType;
import sys.hris.sims.leavetype.repository.LeaveTypeRepository;

// [BARU] Import / export RIWAYAT cuti dalam format ledger (lihat LeaveLedgerCsv) untuk /devAccess.
//
// Export : tiap pengajuan cuti yang disetujui dan memotong jatah cuti dipecah per hari kerja
//          (Sabtu/Minggu/libur dilewati, sama seperti penghitungan total hari), 1 baris per tanggal.
// Import : tiap baris tanggal (1 atau 0.5 hari) menjadi satu catatan cuti berstatus APPROVED dengan
//          penanda is_imported_history (V56) -> tampil di riwayat, tetapi TIDAK ikut hitung saldo.
//
// Aturan import (sesuai kesepakatan):
//   - Karyawan dicocokkan dengan angka belakang NIK + nama. Nomor tidak ketemu / dobel -> dicoba
//     lewat nama yang unik. Nomor ketemu tetapi nama berbeda -> dilewati dan dilaporkan.
//   - Tanggal yang sudah ada dari import sebelumnya dilewati (import ulang aman, tidak dobel).
//   - Tanggal yang bentrok dengan pengajuan cuti asli (PENDING/APPROVED) dilewati.
//   - Dalam satu tanggal total maksimal 1 hari.
//   - [UBAH] Tanggal HANYA YYYY-MM-DD. Sumber file: CSV atau Excel (.xlsx).
//   - [UBAH] Tipe cuti per baris (komentar sel hanya ada di .xlsx):
//       0.5  -> "Cuti setengah hari" (komentar yang tidak memotong jatah ditolak)
//       1    -> "Cuti tahunan"; bila ada komentar -> tipe sesuai teks komentar. Tipe yang TIDAK
//               memotong jatah (cuti khusus) ditolak: harus ditulis 0.
//       0    -> wajib komentar; tipenya harus cuti khusus (tidak memotong jatah). Dicatat 1 hari di
//               riwayat (saldo tidak terpengaruh karena riwayat import tidak ikut hitung saldo). Tanpa komentar diabaikan
//       > 1  -> HANYA cuti hangus/expired (komentar "hangus/expired"); 0.5 / 1 juga boleh untuk hangus.
//               Dicatat sebagai jenis sistem "Cuti hangus" pada tanggal itu, tidak ikut hitung saldo.
//       Cuti beberapa hari ditulis satu baris per hari (tidak ada lagi rentang N hari).
//     Teks komentar harus sama dengan nama tipe cuti di database (huruf besar/kecil & tanda kurung
//     "(Khusus)" boleh dilewatkan). Tipe tidak dikenal -> baris dilewati, TIDAK ada tipe baru dibuat.
//   - [BARU] Export Excel otomatis menambah baris "hangus/expired" untuk sisa cuti tahunan yang
//     kedaluwarsa di periode yang sudah berakhir (lihat LeaveForfeitCalculator).
//   - Baris bermasalah dilewati beserta alasannya; per karyawan satu transaksi.
//   - Opsional (applyRemaining): angka sisa cuti di baris 2 diterapkan ke saldo karyawan.
@Service
public class DevLeaveHistoryService {

    private static final Logger log = LoggerFactory.getLogger(DevLeaveHistoryService.class);

    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_PENDING = "PENDING";
    private static final String ANNUAL_LEAVE_TYPE = "Cuti tahunan";
    private static final String HALF_DAY_LEAVE_TYPE = "Cuti setengah hari";
    private static final String FORFEIT_REASON = "Cuti hangus (import ledger)"; // [BARU]
    private static final String IMPORT_REASON = "Riwayat cuti (import ledger)";
    private static final BigDecimal HALF_DAY = new BigDecimal("0.5");
    private static final int MAX_NAMES_IN_NOTE = 10;

    private final EmployeeRepository employeeRepository;
    private final LeaveRepository leaveRepository;
    private final LeaveStatusRepository leaveStatusRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveService leaveService;
    private final LeaveSummaryService leaveSummaryService; // [BARU] hitung cuti hangus untuk export
    private final DevLeaveDataService devLeaveDataService;
    private final ReportScopeService reportScopeService;
    private final TransactionTemplate transactionTemplate;

    public DevLeaveHistoryService(EmployeeRepository employeeRepository,
                                  LeaveRepository leaveRepository,
                                  LeaveStatusRepository leaveStatusRepository,
                                  LeaveTypeRepository leaveTypeRepository,
                                  LeaveService leaveService,
                                  LeaveSummaryService leaveSummaryService,
                                  DevLeaveDataService devLeaveDataService,
                                  ReportScopeService reportScopeService,
                                  PlatformTransactionManager transactionManager) {
        this.employeeRepository = employeeRepository;
        this.leaveRepository = leaveRepository;
        this.leaveStatusRepository = leaveStatusRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.leaveService = leaveService;
        this.leaveSummaryService = leaveSummaryService;
        this.devLeaveDataService = devLeaveDataService;
        this.reportScopeService = reportScopeService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    // ============================== EXPORT ==============================

    // [UBAH] + periode (from/to, keduanya diisi atau keduanya kosong). Tanggal selalu YYYY-MM-DD.
    // Tanpa periode = seluruh riwayat. Karyawan tanpa pemakaian di periode tetap tampil (kolom kosong).
    // Export CSV seperti sebelumnya: hanya cuti yang memotong jatah, tanpa komentar (CSV tidak bisa
    // menyimpan komentar sel).
    @Transactional(readOnly = true)
    public String exportCsv(LocalDate from, LocalDate to) {
        return LeaveLedgerCsv.write(buildExportRows(from, to, false));
    }

    // [BARU] Export Excel (.xlsx): semua cuti yang disetujui. Tipe cuti selain "Cuti tahunan" dan
    // "Cuti setengah hari" ditulis sebagai KOMENTAR di sel jumlah hari. Cuti yang tidak memotong jatah
    // ditulis 0 hari (aturan import "0 + komentar"), jadi file ini bisa langsung di-import lagi.
    // [BARU] Sisa cuti tahunan yang kedaluwarsa ditulis sebagai baris "hangus/expired" (jumlah = sisa).
    @Transactional(readOnly = true)
    public byte[] exportXlsx(LocalDate from, LocalDate to) {
        return LeaveLedgerXlsx.write(buildExportRows(from, to, true));
    }

    private List<ExportEmployee> buildExportRows(LocalDate from, LocalDate to, boolean includeSpecialLeave) {
        if ((from == null) != (to == null)) {
            throw new IllegalArgumentException("Isi kedua tanggal periode (dari dan sampai), atau kosongkan keduanya.");
        }
        if (from != null && from.isAfter(to)) {
            throw new IllegalArgumentException("Tanggal 'dari' tidak boleh setelah tanggal 'sampai'.");
        }

        // [UBAH] Superadmin dan akun dev tidak ikut export.
        List<Employee> employees = reportableEmployees();
        LocalDate today = leaveSummaryService.today(); // [BARU] acuan "periode sudah berakhir"

        Map<Long, List<LeaveRequest>> leavesByEmployee = new HashMap<>();
        LocalDate minDate = null;
        LocalDate maxDate = null;
        for (Employee employee : employees) {
            List<LeaveRequest> leaves = leaveRepository
                    .findByEmployee_EmployeeIdAndStatus_StatusNameIn(employee.getEmployeeId(), List.of(STATUS_APPROVED))
                    .stream()
                    .filter(leave -> leave.getLeaveType() != null
                            && (includeSpecialLeave || deductsQuota(leave.getLeaveType())))
                    .toList();
            leavesByEmployee.put(employee.getEmployeeId(), leaves);
            for (LeaveRequest leave : leaves) {
                minDate = minDate == null || leave.getStartDate().isBefore(minDate) ? leave.getStartDate() : minDate;
                maxDate = maxDate == null || leave.getEndDate().isAfter(maxDate) ? leave.getEndDate() : maxDate;
            }
        }
        Set<LocalDate> holidays = minDate == null ? Set.of() : leaveService.getHolidayDates(minDate, maxDate);

        List<ExportEmployee> rows = new ArrayList<>();
        for (Employee employee : employees) {
            // Kunci "tanggal|komentar" (tanggal ISO sehingga urut kronologis); komentar sama pada tanggal
            // yang sama digabung.
            Map<String, DayUsage> merged = new TreeMap<>();
            for (LeaveRequest leave : leavesByEmployee.get(employee.getEmployeeId())) {
                LeaveType type = leave.getLeaveType();
                boolean forfeited = isForfeitType(type); // [BARU] catatan hangus hasil import
                String comment = forfeited
                        ? LeaveLedgerCsv.FORFEIT_COMMENT
                        : (includeSpecialLeave ? exportComment(type) : null);
                // [UBAH] Cuti khusus (tidak memotong jatah) = 0; cuti hangus tetap bernilai aslinya.
                boolean zeroDays = includeSpecialLeave && !forfeited && !deductsQuota(type);

                Map<LocalDate, BigDecimal> perDate = new TreeMap<>();
                addUsages(perDate, leave, holidays);
                perDate.forEach((date, amount) -> {
                    boolean inPeriod = from == null || (!date.isBefore(from) && !date.isAfter(to));
                    if (!inPeriod) {
                        return;
                    }
                    BigDecimal days = zeroDays ? BigDecimal.ZERO : amount;
                    merged.merge(date + "|" + (comment == null ? "" : comment),
                            new DayUsage(date, days, comment, forfeited),
                            (a, b) -> new DayUsage(a.date(), a.days().add(b.days()), a.comment(), a.forfeited()));
                });
            }

            // [BARU] Sisa cuti tahunan yang kedaluwarsa di periode yang sudah berakhir dicatat otomatis
            // pada hari terakhir periode, dengan komentar "hangus/expired". Hanya export Excel (komentar
            // tidak bisa disimpan di CSV). Periode yang sudah punya catatan hangus tersimpan dilewati.
            if (includeSpecialLeave) {
                for (Forfeit forfeit : leaveSummaryService.computeForfeits(employee, today)) {
                    LocalDate date = forfeit.expiryDate();
                    boolean inPeriod = from == null || (!date.isBefore(from) && !date.isAfter(to));
                    if (forfeit.stored() || !inPeriod) {
                        continue;
                    }
                    merged.merge(date + "|" + LeaveLedgerCsv.FORFEIT_COMMENT,
                            new DayUsage(date, forfeit.days(), LeaveLedgerCsv.FORFEIT_COMMENT, true),
                            (a, b) -> a);
                }
            }
            List<DayUsage> usages = new ArrayList<>(merged.values());

            LeaveBalanceResponse balance = leaveService.getLeaveBalanceOf(employee);
            rows.add(new ExportEmployee(
                    LeaveLedgerCsv.nikNumberOf(employee.getNikKaryawan()),
                    employee.getFullName(),
                    balance.getTotalRemainingLeave(),
                    usages));
        }

        rows.sort(Comparator
                .comparing(ExportEmployee::nikNumber, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(ExportEmployee::name, String.CASE_INSENSITIVE_ORDER));
        return rows;
    }

    private static boolean deductsQuota(LeaveType type) {
        return !Boolean.FALSE.equals(type.getDeductsAnnualQuota());
    }

    private static boolean isForfeitType(LeaveType type) {
        return type != null && Boolean.TRUE.equals(type.getForfeiture());
    }

    // Komentar export: nama tipe cuti, kecuali cuti tahunan dan setengah hari (null = tanpa komentar).
    private static String exportComment(LeaveType type) {
        String name = type.getName();
        if (name == null || ANNUAL_LEAVE_TYPE.equalsIgnoreCase(name.trim())
                || HALF_DAY_LEAVE_TYPE.equalsIgnoreCase(name.trim())) {
            return null;
        }
        return name.trim();
    }

    // Memecah satu pengajuan menjadi jumlah hari per tanggal (maksimal 1 hari per hari kerja).
    private void addUsages(Map<LocalDate, BigDecimal> target, LeaveRequest leave, Set<LocalDate> holidays) {
        BigDecimal total = leave.getTotalDays() == null ? BigDecimal.ZERO : leave.getTotalDays();
        if (total.signum() <= 0) {
            return;
        }
        LocalDate start = leave.getStartDate();
        LocalDate end = leave.getEndDate();

        // Satu tanggal (termasuk cuti setengah hari dan riwayat import 1 hari): apa adanya.
        // [UBAH] Riwayat import berentang (cuti > 1 hari) kini ikut dipecah per hari kerja.
        if (start.equals(end)) {
            target.merge(start, total, BigDecimal::add);
            return;
        }

        List<LocalDate> workingDays = leaveService.listWorkingDays(start, end, holidays);
        if (workingDays.isEmpty()) {
            target.merge(start, total, BigDecimal::add);
            return;
        }

        BigDecimal remaining = total;
        for (LocalDate day : workingDays) {
            if (remaining.signum() <= 0) {
                break;
            }
            BigDecimal amount = remaining.min(BigDecimal.ONE);
            target.merge(day, amount, BigDecimal::add);
            remaining = remaining.subtract(amount);
        }
        // Total di database lebih besar dari jumlah hari kerja saat ini (mis. data libur berubah).
        if (remaining.signum() > 0) {
            target.merge(workingDays.get(workingDays.size() - 1), remaining, BigDecimal::add);
        }
    }

    // ============================== IMPORT ==============================

    private record ImportContext(LeaveStatus approvedStatus, LeaveType annualType, LeaveType halfDayType,
                                 LeaveType forfeitType, // [BARU] null bila V59 belum dijalankan
                                 Map<String, LeaveType> typesByExactKey,
                                 Map<String, List<LeaveType>> typesByBaseKey) {
    }

    // Satu catatan cuti yang akan disimpan (1 baris file = 1 catatan; cuti > 1 hari = rentang).
    private record PlannedLeave(LocalDate start, LocalDate end, BigDecimal days, LeaveType type,
                                boolean commentIgnored, boolean forfeit) {
        // [BARU] Cuti khusus "0 hari" dicatat 1 hari di riwayat (tidak memotong saldo, lihat V56).
        BigDecimal storedDays() {
            return days.signum() == 0 ? BigDecimal.ONE : days;
        }
    }

    private record PlanResult(PlannedLeave plan, String problem) {
    }

    private record BlockOutcome(List<ImportRowResult> rows, int created, int skippedBeforeSave,
                                int ignoredComments, Map<String, Integer> createdByType) {
    }

    private record MatchResult(Employee employee, String note, String problem) {
    }

    private record DateRange(LocalDate start, LocalDate end) {
        boolean overlaps(LocalDate otherStart, LocalDate otherEnd) {
            return !otherStart.isAfter(end) && !otherEnd.isBefore(start);
        }
    }

    // [BARU] Import dari file CSV (tanpa komentar sel).
    // [UBAH] dryRun = true -> pratinjau: seluruh aturan diperiksa persis seperti import sungguhan,
    // tetapi TIDAK ada yang disimpan dan sisa cuti tidak diterapkan.
    public ImportResultResponse importCsv(String csvText, boolean applyRemaining, boolean dryRun) {
        return importLedger(LeaveLedgerCsv.parse(csvText), applyRemaining, dryRun);
    }

    // [BARU] Import dari file Excel (.xlsx): komentar sel dibaca sebagai tipe cuti.
    public ImportResultResponse importXlsx(byte[] xlsxContent, boolean applyRemaining, boolean dryRun) {
        return importLedger(LeaveLedgerXlsx.parse(xlsxContent), applyRemaining, dryRun);
    }

    // Tanpa @Transactional di level method ini: tiap karyawan punya transaksi sendiri.
    private ImportResultResponse importLedger(Ledger ledger, boolean applyRemaining, boolean dryRun) {
        if (ledger.blocks().isEmpty()) {
            throw new IllegalArgumentException("File tidak berisi data karyawan.");
        }

        ImportContext context = buildContext();

        List<Employee> employees = reportableEmployees(); // [UBAH] superadmin/dev tidak ikut dicocokkan
        Map<Integer, List<Employee>> employeesByNumber = new HashMap<>();
        for (Employee employee : employees) {
            Integer number = LeaveLedgerCsv.nikNumberOf(employee.getNikKaryawan());
            if (number != null) {
                employeesByNumber.computeIfAbsent(number, key -> new ArrayList<>()).add(employee);
            }
        }

        LocalDate today = LocalDate.now();
        List<ImportRowResult> results = new ArrayList<>();
        List<String> notes = new ArrayList<>();
        Map<String, Integer> createdByType = new LinkedHashMap<>();
        int createdTotal = 0;
        int employeesImported = 0;
        int zeroIgnored = 0;
        int commentsIgnored = 0;
        int remainingApplied = 0;
        List<String> unmatchedNames = new ArrayList<>();
        List<String> matchedByName = new ArrayList<>();
        List<String> remainingProblems = new ArrayList<>();

        for (Block block : ledger.blocks()) {
            List<ResolvedEntry> resolved = LeaveLedgerCsv.resolveEntries(block, today);
            zeroIgnored += (int) resolved.stream().filter(entry -> entry.status() == EntryStatus.ZERO).count();
            int usable = (int) resolved.stream().filter(entry -> entry.status() != EntryStatus.ZERO).count();

            String displayName = block.name().isEmpty()
                    ? "(kolom " + LeaveLedgerCsv.columnLetter(block.column() + 1) + ")"
                    : block.name();

            MatchResult match = matchEmployee(block, employees, employeesByNumber);
            if (match.employee() == null) {
                unmatchedNames.add(displayName);
                if (usable > 0) {
                    results.add(ImportRowResult.skipped(2, displayName,
                            usable + " tanggal dilewati: " + match.problem()));
                }
                continue;
            }
            if (match.note() != null) {
                matchedByName.add(displayName);
            }

            Long employeeId = match.employee().getEmployeeId();
            BlockOutcome outcome;
            try {
                outcome = transactionTemplate.execute(
                        status -> importBlock(employeeId, displayName, resolved, context, dryRun));
            } catch (RuntimeException ex) {
                log.error("Import riwayat cuti {} gagal", displayName, ex);
                outcome = null;
                results.add(ImportRowResult.skipped(2, displayName,
                        usable + " tanggal dilewati: gagal disimpan (" + ex.getMessage() + ")."));
            }
            if (outcome != null) {
                results.addAll(outcome.rows());
                createdTotal += outcome.created();
                commentsIgnored += outcome.ignoredComments();
                outcome.createdByType().forEach((name, count) -> createdByType.merge(name, count, Integer::sum));
                if (outcome.created() > 0) {
                    employeesImported++;
                }
            }

            if (applyRemaining && !dryRun && !block.remainingText().isEmpty()) {
                try {
                    BigDecimal total = LeaveLedgerCsv.parseRemaining(block.remainingText());
                    if (total != null && total.signum() < 0) {
                        remainingProblems.add(displayName + ": sisa negatif (" + total.toPlainString()
                                + ") tidak bisa diterapkan");
                    } else if (total != null) {
                        transactionTemplate.executeWithoutResult(status -> {
                            Employee fresh = employeeRepository.findById(employeeId).orElseThrow();
                            devLeaveDataService.applyTotalRemaining(fresh, total);
                        });
                        remainingApplied++;
                    }
                } catch (IllegalArgumentException ex) {
                    remainingProblems.add(displayName + ": " + ex.getMessage());
                } catch (RuntimeException ex) {
                    log.error("Penerapan sisa cuti {} gagal", displayName, ex);
                    remainingProblems.add(displayName + ": gagal diterapkan");
                }
            }
        }

        if (dryRun) {
            notes.add("PRATINJAU: belum ada data yang disimpan.");
        }
        notes.add("Riwayat: " + createdTotal + " catatan cuti " + (dryRun ? "akan ditambahkan" : "ditambahkan")
                + " untuk " + employeesImported + " karyawan.");
        if (!createdByType.isEmpty()) {
            notes.add("Per tipe cuti: " + createdByType.entrySet().stream()
                    .map(entry -> entry.getKey() + " " + entry.getValue())
                    .collect(Collectors.joining(", ")) + ".");
        }
        if (zeroIgnored > 0) {
            notes.add(zeroIgnored + " baris bernilai 0 hari tanpa komentar diabaikan.");
        }
        if (commentsIgnored > 0) {
            notes.add(commentsIgnored + " komentar pada baris 0.5 hari diabaikan (selalu Cuti setengah hari).");
        }
        if (!unmatchedNames.isEmpty()) {
            notes.add(unmatchedNames.size() + " karyawan di file tidak cocok dengan database: "
                    + limitedNames(unmatchedNames) + ".");
        }
        if (!matchedByName.isEmpty()) {
            notes.add("Dicocokkan lewat nama (nomor NIK tidak cocok): " + limitedNames(matchedByName) + ".");
        }
        if (applyRemaining && dryRun) {
            notes.add("Sisa cuti tidak diterapkan di pratinjau.");
        } else if (applyRemaining) {
            notes.add("Sisa cuti diterapkan untuk " + remainingApplied + " karyawan.");
            if (!remainingProblems.isEmpty()) {
                notes.add("Sisa cuti dilewati: " + limitedNames(remainingProblems) + ".");
            }
        }
        return ImportResultResponse.of(results, notes);
    }

    private ImportContext buildContext() {
        LeaveStatus approved = leaveStatusRepository.findByStatusNameIgnoreCase(STATUS_APPROVED)
                .orElseThrow(() -> new IllegalArgumentException("Status APPROVED tidak ditemukan di database."));
        LeaveType annual = leaveTypeRepository.findByNameIgnoreCase(ANNUAL_LEAVE_TYPE)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Jenis cuti '" + ANNUAL_LEAVE_TYPE + "' tidak ditemukan di database."));
        LeaveType halfDay = leaveTypeRepository.findByNameIgnoreCase(HALF_DAY_LEAVE_TYPE)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Jenis cuti '" + HALF_DAY_LEAVE_TYPE + "' tidak ditemukan di database."));

        LeaveType forfeit = leaveTypeRepository.findFirstByForfeitureTrue().orElse(null); // [BARU]

        Map<String, LeaveType> byExactKey = new HashMap<>();
        Map<String, List<LeaveType>> byBaseKey = new HashMap<>();
        for (LeaveType type : leaveTypeRepository.findAll()) {
            if (isForfeitType(type)) {
                continue; // jenis sistem: hanya lewat komentar "hangus/expired", bukan pencocokan nama
            }
            byExactKey.putIfAbsent(typeKey(type.getName()), type);
            byBaseKey.computeIfAbsent(baseTypeKey(type.getName()), key -> new ArrayList<>()).add(type);
        }
        return new ImportContext(approved, annual, halfDay, forfeit, byExactKey, byBaseKey);
    }

    // Satu transaksi per karyawan. Hanya membaca/menulis catatan hasil import milik karyawan ini.
    private BlockOutcome importBlock(Long employeeId, String displayName,
                                     List<ResolvedEntry> resolved, ImportContext context, boolean dryRun) {
        List<LeaveRequest> existing = leaveRepository.findByEmployee_EmployeeId(employeeId);

        // Rentang yang sudah terisi dari import SEBELUMNYA (snapshot sebelum import ini mulai).
        // [UBAH] Catatan hangus dipisah: tidak memblokir tanggal cuti biasa (dan sebaliknya).
        List<DateRange> importedBefore = existing.stream()
                .filter(leave -> Boolean.TRUE.equals(leave.getImportedHistory()))
                .filter(leave -> !isForfeitType(leave.getLeaveType()))
                .map(leave -> new DateRange(leave.getStartDate(), leave.getEndDate()))
                .toList();
        List<DateRange> forfeitBefore = existing.stream()
                .filter(leave -> isForfeitType(leave.getLeaveType()))
                .map(leave -> new DateRange(leave.getStartDate(), leave.getEndDate()))
                .toList();
        // Pengajuan cuti asli yang masih berlaku (bukan hasil import).
        List<DateRange> activeReal = existing.stream()
                .filter(leave -> !Boolean.TRUE.equals(leave.getImportedHistory()))
                .filter(leave -> !isForfeitType(leave.getLeaveType()))
                .filter(leave -> leave.getStatus() != null
                        && (STATUS_APPROVED.equalsIgnoreCase(leave.getStatus().getStatusName())
                        || STATUS_PENDING.equalsIgnoreCase(leave.getStatus().getStatusName())))
                .map(leave -> new DateRange(leave.getStartDate(), leave.getEndDate()))
                .toList();

        Employee employee = employeeRepository.getReferenceById(employeeId);
        Map<LocalDate, BigDecimal> inFileByDate = new HashMap<>();
        java.util.Set<LocalDate> forfeitDatesInFile = new java.util.HashSet<>(); // [BARU]
        Map<String, Integer> createdByType = new LinkedHashMap<>();
        List<LeaveRequest> toSave = new ArrayList<>();
        List<ImportRowResult> rows = new ArrayList<>();
        int skipped = 0;
        int ignoredComments = 0;

        for (ResolvedEntry entry : resolved) {
            int csvRow = entry.entry().csvRow();
            if (entry.status() == EntryStatus.ZERO) {
                continue;
            }
            if (entry.status() == EntryStatus.INVALID) {
                rows.add(ImportRowResult.skipped(csvRow, displayName, entry.message()));
                skipped++;
                continue;
            }

            String where = "Kolom " + LeaveLedgerCsv.columnLetter(entry.entry().csvColumn() + 1) + " baris " + csvRow + ": ";
            PlanResult planResult = planLeave(entry, context);
            if (planResult.problem() != null) {
                rows.add(ImportRowResult.skipped(csvRow, displayName, where + planResult.problem()));
                skipped++;
                continue;
            }
            PlannedLeave plan = planResult.plan();
            String rangeText = plan.start().equals(plan.end())
                    ? plan.start().toString()
                    : plan.start() + " s/d " + plan.end();

            // [BARU] Cuti hangus: hanya dicek terhadap catatan hangus lain di tanggal yang sama.
            // Tidak dibatasi 1 hari/tanggal dan tidak bentrok dengan cuti biasa (hari terakhir periode
            // boleh sekaligus hari cuti).
            if (plan.forfeit()) {
                if (forfeitBefore.stream().anyMatch(range -> range.overlaps(plan.start(), plan.end()))
                        || !forfeitDatesInFile.add(plan.start())) {
                    rows.add(ImportRowResult.skipped(csvRow, displayName,
                            "Cuti hangus tanggal " + rangeText + " sudah ada (import sebelumnya atau baris lain di file ini)."));
                    skipped++;
                    continue;
                }
            } else {
                if (importedBefore.stream().anyMatch(range -> range.overlaps(plan.start(), plan.end()))) {
                    rows.add(ImportRowResult.skipped(csvRow, displayName,
                            "Tanggal " + rangeText + " sudah ada dari import sebelumnya."));
                    skipped++;
                    continue;
                }
                if (activeReal.stream().anyMatch(range -> range.overlaps(plan.start(), plan.end()))) {
                    rows.add(ImportRowResult.skipped(csvRow, displayName,
                            "Tanggal " + rangeText + " bentrok dengan pengajuan cuti yang sudah ada."));
                    skipped++;
                    continue;
                }

                // Pemakaian per tanggal: 0.5 / 1 hari (cuti hari penuh/khusus tercatat 1).
                BigDecimal perDate = plan.storedDays();
                BigDecimal alreadyOnDate = inFileByDate.getOrDefault(plan.start(), BigDecimal.ZERO);
                if (alreadyOnDate.add(perDate).compareTo(BigDecimal.ONE) > 0) {
                    rows.add(ImportRowResult.skipped(csvRow, displayName,
                            "Tanggal " + plan.start() + " sudah tercatat " + alreadyOnDate.toPlainString()
                                    + " hari di file ini (maksimal 1 hari per tanggal)."));
                    skipped++;
                    continue;
                }
                inFileByDate.merge(plan.start(), perDate, BigDecimal::add);
            }
            toSave.add(LeaveRequest.builder()
                    .employee(employee)
                    .status(context.approvedStatus())
                    .leaveType(plan.type())
                    .startDate(plan.start())
                    .endDate(plan.end())
                    .totalDays(plan.storedDays().setScale(2, RoundingMode.HALF_UP)) // [UBAH] 0 hari -> 1 hari
                    .manualLeaveDays(BigDecimal.ZERO)
                    .session(null)
                    .approvedAt(plan.start().atStartOfDay())
                    .reason(plan.forfeit() ? FORFEIT_REASON : IMPORT_REASON)
                    .importedHistory(true)
                    .build());
            createdByType.merge(plan.type().getName(), 1, Integer::sum);
            if (plan.commentIgnored()) {
                ignoredComments++;
            }
            String verb = dryRun ? " hari akan ditambahkan (" : " hari ditambahkan (";
            rows.add(ImportRowResult.success(csvRow, displayName,
                    plan.storedDays().stripTrailingZeros().toPlainString() + verb + plan.type().getName() + ", " + rangeText
                            + (plan.days().signum() == 0 ? "; cuti khusus, tidak memotong saldo" : "")
                            + (plan.forfeit() ? "; cuti hangus, tidak memotong saldo" : "") + ")."));
        }

        if (!dryRun) {
            leaveRepository.saveAll(toSave);
        }
        return new BlockOutcome(rows, toSave.size(), skipped, ignoredComments, createdByType);
    }

    // ============================== TIPE CUTI DARI KOMENTAR ==============================

    // Menentukan tipe cuti satu baris (aturan jumlah hari: lihat komentar kelas). Satu baris = satu tanggal.
    private PlanResult planLeave(ResolvedEntry entry, ImportContext context) {
        BigDecimal days = entry.days();
        LocalDate date = entry.date();
        String comment = entry.entry().comment();

        // [BARU] Cuti hangus/expired: nilai 0.5 / 1 / lebih besar mengikuti isi sel (sudah divalidasi).
        if (LeaveLedgerCsv.isForfeitComment(comment)) {
            if (context.forfeitType() == null) {
                return problem("jenis cuti sistem 'Cuti hangus' belum ada di database. Jalankan migration V59 lebih dulu.");
            }
            return plan(new PlannedLeave(date, date, days, context.forfeitType(), false, true));
        }

        // Tipe dari komentar (null bila tidak ada komentar).
        LeaveType commentType = null;
        if (comment != null) {
            List<LeaveType> candidates = findTypes(comment, context);
            if (!candidates.isEmpty()) {
                if (candidates.size() > 1) {
                    return problem("komentar '" + comment + "' cocok dengan lebih dari satu tipe cuti. Tulis nama lengkap tipe cuti.");
                }
                commentType = candidates.get(0);
            } else if (days.compareTo(HALF_DAY) != 0) {
                return problem("tipe cuti dari komentar '" + comment + "' tidak ditemukan di database. Tipe yang dikenali: "
                        + limitedNames(context.typesByExactKey().values().stream().map(LeaveType::getName).sorted().toList()) + ".");
            }
        }

        // 0.5 hari = selalu setengah hari. Komentar yang menunjuk cuti khusus (0 hari) bertentangan -> ditolak.
        if (days.compareTo(HALF_DAY) == 0) {
            if (commentType != null && !deductsQuota(commentType)) {
                return problem("cuti khusus '" + commentType.getName() + "' tidak memotong jatah sehingga harus bernilai 0, bukan 0.5.");
            }
            return plan(new PlannedLeave(date, date, days, context.halfDayType(), comment != null, false));
        }

        LeaveType type = commentType != null ? commentType : context.annualType();

        if (type.getLeaveTypeId().equals(context.halfDayType().getLeaveTypeId())) {
            return problem("tipe '" + type.getName() + "' hanya untuk 0.5 hari (ditemukan " + days.toPlainString() + " hari).");
        }

        boolean deductsQuota = deductsQuota(type);
        if (days.signum() == 0) {
            if (deductsQuota) {
                return problem("0 hari hanya untuk cuti khusus yang tidak memotong jatah, sedangkan '"
                        + type.getName() + "' memotong jatah cuti tahunan.");
            }
            return plan(new PlannedLeave(date, date, BigDecimal.ZERO, type, false, false));
        }

        // days == 1
        if (!deductsQuota) {
            return problem("cuti khusus '" + type.getName() + "' tidak memotong jatah sehingga harus bernilai 0, bukan "
                    + days.toPlainString() + ".");
        }
        return plan(new PlannedLeave(date, date, days, type, false, false));
    }

    private static PlanResult plan(PlannedLeave leave) {
        return new PlanResult(leave, null);
    }

    private static PlanResult problem(String message) {
        return new PlanResult(null, message);
    }

    // Cocokkan teks komentar dengan nama tipe cuti: persis (tanpa beda huruf besar/kecil) dulu,
    // lalu tanpa tanda kurung ("Cuti nikah" -> "Cuti nikah (Khusus)"). Bila komentar diawali
    // "Nama:" (bawaan Excel), bagian setelah titik dua juga dicoba.
    private List<LeaveType> findTypes(String comment, ImportContext context) {
        List<String> texts = new ArrayList<>();
        texts.add(comment);
        int colon = comment.indexOf(':');
        if (colon >= 0 && colon < comment.length() - 1) {
            texts.add(comment.substring(colon + 1));
        }
        for (String text : texts) {
            LeaveType exact = context.typesByExactKey().get(typeKey(text));
            if (exact != null) {
                return List.of(exact);
            }
            List<LeaveType> base = context.typesByBaseKey().getOrDefault(baseTypeKey(text), List.of());
            if (!base.isEmpty()) {
                return base;
            }
        }
        return List.of();
    }

    private static String typeKey(String name) {
        return name == null ? "" : name.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    // Tanpa teks dalam tanda kurung: "Cuti nikah (Khusus)" -> "cuti nikah".
    private static String baseTypeKey(String name) {
        return typeKey(name == null ? "" : name.replaceAll("\\([^)]*\\)", " "));
    }

    // ============================== PENCOCOKAN KARYAWAN ==============================

    private MatchResult matchEmployee(Block block, List<Employee> employees,
                                      Map<Integer, List<Employee>> employeesByNumber) {
        String fileName = block.name();
        if (fileName.isEmpty()) {
            return new MatchResult(null, null, "kolom ini tidak punya nama karyawan.");
        }
        String nameKey = nameKey(fileName);

        List<Employee> byNumber = block.nikNumber() == null
                ? List.of()
                : employeesByNumber.getOrDefault(block.nikNumber(), List.of());

        if (byNumber.size() == 1) {
            Employee candidate = byNumber.get(0);
            if (nameKey(candidate.getFullName()).equals(nameKey)) {
                return new MatchResult(candidate, null, null);
            }
            return new MatchResult(null, null, "nomor " + block.nikNumber() + " milik '"
                    + candidate.getFullName() + "' di database, tetapi nama di file '" + fileName
                    + "'. Samakan nama atau perbaiki NIK.");
        }

        // Nomor tidak ditemukan / dipakai lebih dari satu karyawan -> cari lewat nama yang unik.
        List<Employee> pool = byNumber.size() > 1 ? byNumber : employees;
        List<Employee> byName = pool.stream()
                .filter(employee -> nameKey(employee.getFullName()).equals(nameKey))
                .toList();
        if (byName.size() == 1) {
            return new MatchResult(byName.get(0), "nama", null);
        }
        if (byName.size() > 1) {
            return new MatchResult(null, null, "ada lebih dari satu karyawan bernama '" + fileName + "'.");
        }
        return new MatchResult(null, null, byNumber.isEmpty()
                ? "nomor NIK " + (block.nikNumber() == null ? "(kosong)" : block.nikNumber())
                        + " tidak ditemukan dan tidak ada karyawan bernama '" + fileName + "'."
                : "nomor NIK " + block.nikNumber() + " dipakai lebih dari satu karyawan dan nama '"
                        + fileName + "' tidak cocok dengan salah satunya.");
    }

    // ============================== PEMBANTU ==============================

    // [UBAH] dulu withoutDevEmployees; sekarang juga tanpa SUPER_ADMIN (aturan yang sama dengan laporan).
    private List<Employee> reportableEmployees() {
        return reportScopeService.onlyReportableEmployees(employeeRepository.findAll());
    }

    private static String nameKey(String name) {
        return name == null ? "" : name.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private static String limitedNames(List<String> names) {
        if (names.size() <= MAX_NAMES_IN_NOTE) {
            return String.join(", ", names);
        }
        return String.join(", ", names.subList(0, MAX_NAMES_IN_NOTE)) + ", dan " + (names.size() - MAX_NAMES_IN_NOTE) + " lainnya";
    }
}
