package sys.hris.sims.leave.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.TreeSet;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.common.service.ReportScopeService;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.dto.ForfeitRuleScanResponse;
import sys.hris.sims.leave.dto.LeaveBalanceResponse;
import sys.hris.sims.leave.dto.LeaveReconciliationRow;
import sys.hris.sims.leave.dto.LeaveSummaryResponse;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.leave.service.LeaveForfeitCalculator.Forfeit;
import sys.hris.sims.leave.service.LeaveForfeitCalculator.StoredForfeit;
import sys.hris.sims.leave.service.LeaveForfeitCalculator.Usage;

// [BARU] Ringkasan cuti global (sejak tanggal masuk sampai hari ini) + daftar cuti hangus.
//
// Satu sumber kebenaran untuk dua pemakai:
//   1. Tabel "Ringkasan Cuti" (GET /api/cuti/summary/all)
//   2. Export riwayat cuti ledger (DevLeaveHistoryService) -- baris "hangus/expired"
//
// Saldo tersedia / sisa lama / sisa berjalan diambil dari LeaveService.getLeaveBalanceOf supaya
// selalu sama dengan angka di Dashboard dan Direktori Karyawan.
@Service
@RequiredArgsConstructor
public class LeaveSummaryService {

    private static final String STATUS_APPROVED = "APPROVED";
    private static final ZoneId ZONE = ZoneId.of("Asia/Jakarta");

    private final LeaveService leaveService;
    private final LeaveRepository leaveRepository;
    private final EmployeeRepository employeeRepository;
    private final ReportScopeService reportScopeService;
    private final LeaveRuleService leaveRuleService; // [BARU] tanggal berlaku hangus yang bisa diatur

    public LocalDate today() {
        return LocalDate.now(ZONE);
    }

    @Transactional(readOnly = true)
    public List<LeaveSummaryResponse> getAllSummaries() {
        LocalDate today = today();
        LocalDate forfeitStart = leaveRuleService.getForfeitStartDate(); // [BARU] dibaca sekali
        return reportScopeService.onlyReportableEmployees(employeeRepository.findAll()).stream()
                // [UBAH] Urut NIK (angka), bukan nama. NIK kosong di akhir.
                .sorted(Comparator.comparing(Employee::getNikKaryawan,
                        Comparator.nullsLast(Comparator.comparingLong(LeaveSummaryService::nikAsNumber))))
                .map(employee -> summarize(employee, today, forfeitStart))
                .toList();
    }

    @Transactional(readOnly = true)
    public LeaveSummaryResponse summarize(Employee employee, LocalDate today) {
        return summarize(employee, today, leaveRuleService.getForfeitStartDate());
    }

    private LeaveSummaryResponse summarize(Employee employee, LocalDate today, LocalDate forfeitStart) {
        LeaveBalanceResponse balance = leaveService.getLeaveBalanceOf(employee);
        EmployeeLeaveData data = loadData(employee);
        List<Forfeit> forfeits = computeForfeits(employee, data, today, forfeitStart);

        BigDecimal forfeited = forfeits.stream()
                .filter(item -> !item.expiryDate().isAfter(today))
                .map(Forfeit::days)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal used = usedSinceJoin(employee, data, today);
        BigDecimal remainingPrevious = nonNull(balance.getRemainingManualLeave());
        BigDecimal remainingCurrent = nonNull(balance.getRemainingAnnualLeave());
        BigDecimal available = remainingPrevious.add(remainingCurrent);

        // [UBAH] Total keseluruhan = kuota sejak masuk (kuota dasar x tahun kerja), bukan lagi used + forfeited + available.
        LeaveReconciliationRow check = reconcile(employee, data, available, today, forfeitStart);

        return LeaveSummaryResponse.builder()
                .employeeId(employee.getEmployeeId())
                .employeeName(employee.getFullName())
                .nik(employee.getNikKaryawan())
                .divisionName(employee.getDivisi() == null ? null : employee.getDivisi().getNamaDivisi())
                .joinDate(employee.getJoinDate())
                .asOfDate(today)
                .totalOverallLeave(check.totalGrantedQuota())
                .usedLeave(used)
                .forfeitedLeave(forfeited)
                .totalAvailableLeave(available)
                .remainingPreviousLeave(remainingPrevious)
                .remainingCurrentLeave(remainingCurrent)
                .reconcileDifference(check.difference())
                .reconcileStatus(check.status())
                .build();
    }

    // Cuti hangus satu karyawan (tersimpan + dihitung) untuk periode yang sudah berakhir.
    @Transactional(readOnly = true)
    public List<Forfeit> computeForfeits(Employee employee, LocalDate today) {
        return computeForfeits(employee, loadData(employee), today, leaveRuleService.getForfeitStartDate());
    }

    private List<Forfeit> computeForfeits(Employee employee, EmployeeLeaveData data, LocalDate today,
                                          LocalDate forfeitStart) {
        if (employee.getJoinDate() == null) {
            return List.of();
        }
        return LeaveForfeitCalculator.calculate(
                employee.getJoinDate(),
                leaveService.getBaseAnnualQuotaOf(employee),
                today,
                data.trackingStart(),
                data.usages(),
                data.storedForfeits(),
                employee.getAnnualUsedOutsideSystem(),
                employee.getAnnualUsedOutsidePeriodStart(),
                forfeitStart);
    }

    // Cuti yang memotong jatah sejak tanggal masuk sampai hari ini. Angka "terpakai di luar sistem"
    // ikut dihitung hanya bila periodenya belum punya riwayat tanggal hasil import (anti ganda).
    private BigDecimal usedSinceJoin(Employee employee, EmployeeLeaveData data, LocalDate today) {
        LocalDate joinDate = employee.getJoinDate();
        BigDecimal used = data.usages().stream()
                .filter(item -> (joinDate == null || !item.date().isBefore(joinDate)) && (today == null || !item.date().isAfter(today)))
                .map(Usage::totalDays)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outside = nonNull(employee.getAnnualUsedOutsideSystem());
        LocalDate outsideStart = employee.getAnnualUsedOutsidePeriodStart();
        if (outside.signum() > 0 && outsideStart != null) {
            LocalDate outsideEnd = outsideStart.plusYears(1);
            boolean hasImportedInPeriod = data.usages().stream().anyMatch(item -> item.imported()
                    && !item.date().isBefore(outsideStart) && item.date().isBefore(outsideEnd));
            if (!hasImportedInPeriod) {
                used = used.add(outside);
            }
        }
        return used;
    }

    // ======================= [BARU] PENCOCOKAN DATA & PEMINDAIAN TAHUN HANGUS =======================
    //
    // Identitas yang diperiksa (per karyawan):
    //   total kuota sejak masuk = kuota dasar x jumlah ulang tahun kerja yang sudah lewat
    //   sisa seharusnya         = total kuota - terpakai (semua tanggal) - hangus (periode yang sudah berakhir)
    // Sisa seharusnya dibandingkan dengan sisa di sistem (sisa lama + sisa tahun berjalan). Selisih != 0
    // berarti ada data yang salah/kurang (pemakaian belum diinput, sisa salah ketik, tanggal masuk salah,
    // atau tanggal berlaku hangus yang dipakai tidak tepat).
    private static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    private LeaveReconciliationRow reconcile(Employee employee, EmployeeLeaveData data, BigDecimal actualRemaining,
                                             LocalDate today, LocalDate forfeitStart) {
        LocalDate joinDate = employee.getJoinDate();
        int fullYears = joinDate == null ? 0 : (int) Math.max(0, ChronoUnit.YEARS.between(joinDate, today));
        BigDecimal total = leaveService.getBaseAnnualQuotaOf(employee).multiply(BigDecimal.valueOf(fullYears));
        BigDecimal used = usedSinceJoin(employee, data, null);
        BigDecimal forfeited = computeForfeits(employee, data, today, forfeitStart).stream()
                .filter(item -> !item.expiryDate().isAfter(today))
                .map(Forfeit::days)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expected = total.subtract(used).subtract(forfeited);
        BigDecimal difference = actualRemaining.subtract(expected);

        String status;
        if (fullYears == 0) {
            status = LeaveReconciliationRow.NOT_ELIGIBLE;
        } else if (data.trackingStart() == null) {
            status = LeaveReconciliationRow.NO_HISTORY;
        } else {
            status = difference.abs().compareTo(TOLERANCE) < 0 ? LeaveReconciliationRow.OK : LeaveReconciliationRow.MISMATCH;
        }
        return new LeaveReconciliationRow(employee.getEmployeeId(), employee.getFullName(), employee.getNikKaryawan(),
                joinDate, fullYears, total, used, forfeited, actualRemaining, expected, difference, status);
    }

    // Pemeriksaan data semua karyawan (untuk tabel Histori Cuti / ledger) pada aturan hangus yang aktif.
    @Transactional(readOnly = true)
    public List<LeaveReconciliationRow> reconcileAll() {
        LocalDate today = today();
        LocalDate forfeitStart = leaveRuleService.getForfeitStartDate();
        List<LeaveReconciliationRow> rows = new ArrayList<>();
        for (Employee employee : reportScopeService.onlyReportableEmployees(employeeRepository.findAll())) {
            BigDecimal actual = nonNull(leaveService.getLeaveBalanceOf(employee).getTotalRemainingLeave());
            rows.add(reconcile(employee, loadData(employee), actual, today, forfeitStart));
        }
        return rows;
    }

    // Pemeriksaan saat IMPORT ledger: data di database + baris file yang AKAN disimpan, dibandingkan dengan
    // angka sisa (残日数) di file. extraUsages / extraForfeits hanya baris baru dari file (yang tanggalnya
    // sudah ada di database dilewati oleh import dan tidak boleh ikut, supaya tidak dihitung dua kali).
    @Transactional(readOnly = true)
    public LeaveReconciliationRow reconcileWithImport(Employee employee, BigDecimal remainingFromFile,
                                                      List<Usage> extraUsages, List<StoredForfeit> extraForfeits,
                                                      LocalDate forfeitStart) {
        EmployeeLeaveData base = loadData(employee);
        List<Usage> usages = new ArrayList<>(base.usages());
        usages.addAll(extraUsages);
        List<StoredForfeit> stored = new ArrayList<>(base.storedForfeits());
        stored.addAll(extraForfeits);
        LocalDate tracking = base.trackingStart();
        for (Usage usage : extraUsages) {
            if (tracking == null || usage.date().isBefore(tracking)) {
                tracking = usage.date();
            }
        }
        for (StoredForfeit item : extraForfeits) {
            if (tracking == null || item.date().isBefore(tracking)) {
                tracking = item.date();
            }
        }
        return reconcile(employee, new EmployeeLeaveData(usages, stored, tracking), remainingFromFile,
                today(), forfeitStart);
    }

    // Memindai tanggal berlaku hangus yang paling cocok dengan data saat ini. Kandidat = 1 Januari tiap tahun
    // dari tahun masuk terawal sampai tahun ini, ditambah NEVER (cuti tidak pernah hangus) dan tanggal aktif.
    @Transactional(readOnly = true)
    public ForfeitRuleScanResponse scanForfeitStartDates() {
        LocalDate today = today();
        LocalDate current = leaveRuleService.getForfeitStartDate();
        List<Employee> employees = reportScopeService.onlyReportableEmployees(employeeRepository.findAll());

        int firstYear = employees.stream().map(Employee::getJoinDate).filter(java.util.Objects::nonNull)
                .mapToInt(LocalDate::getYear).min().orElse(today.getYear());
        TreeSet<LocalDate> candidateDates = new TreeSet<>();
        for (int year = Math.max(2000, firstYear); year <= today.getYear(); year++) {
            candidateDates.add(LocalDate.of(year, 1, 1));
        }
        candidateDates.add(LeaveRuleService.NEVER);
        candidateDates.add(current);

        int[] matched = new int[candidateDates.size()];
        int[] mismatched = new int[candidateDates.size()];
        List<LocalDate> dates = new ArrayList<>(candidateDates);
        List<LeaveReconciliationRow> currentMismatches = new ArrayList<>();
        int checked = 0;
        int skipped = 0;

        for (Employee employee : employees) {
            EmployeeLeaveData data = loadData(employee);
            BigDecimal actual = nonNull(leaveService.getLeaveBalanceOf(employee).getTotalRemainingLeave());
            boolean counted = true;
            for (int i = 0; i < dates.size(); i++) {
                LeaveReconciliationRow row = reconcile(employee, data, actual, today, dates.get(i));
                if (LeaveReconciliationRow.NOT_ELIGIBLE.equals(row.status())
                        || LeaveReconciliationRow.NO_HISTORY.equals(row.status())) {
                    counted = false;
                    break; // status ini tidak bergantung pada tanggal hangus
                }
                if (LeaveReconciliationRow.OK.equals(row.status())) {
                    matched[i]++;
                } else {
                    mismatched[i]++;
                    if (dates.get(i).equals(current)) {
                        currentMismatches.add(row);
                    }
                }
            }
            if (counted) {
                checked++;
            } else {
                skipped++;
            }
        }

        int bestIndex = 0;
        for (int i = 1; i < dates.size(); i++) {
            boolean better = matched[i] > matched[bestIndex]
                    || (matched[i] == matched[bestIndex] && dates.get(i).equals(current) && !dates.get(bestIndex).equals(current));
            if (better) {
                bestIndex = i;
            }
        }
        List<ForfeitRuleScanResponse.Candidate> candidates = new ArrayList<>();
        for (int i = 0; i < dates.size(); i++) {
            candidates.add(new ForfeitRuleScanResponse.Candidate(dates.get(i), matched[i], mismatched[i],
                    dates.get(i).equals(current), i == bestIndex));
        }
        currentMismatches.sort((left, right) -> right.difference().abs().compareTo(left.difference().abs()));
        return new ForfeitRuleScanResponse(current, dates.get(bestIndex), today, checked, skipped, candidates, currentMismatches);
    }

    // ---------------------------------------------------------------------------------------

    private record EmployeeLeaveData(List<Usage> usages, List<StoredForfeit> storedForfeits, LocalDate trackingStart) {
    }

    private EmployeeLeaveData loadData(Employee employee) {
        List<Usage> usages = new ArrayList<>();
        List<StoredForfeit> stored = new ArrayList<>();
        LocalDate earliest = employee.getAnnualUsedOutsidePeriodStart();

        for (LeaveRequest leave : leaveRepository.findByEmployee_EmployeeId(employee.getEmployeeId())) {
            if (leave.getStatus() == null || !STATUS_APPROVED.equalsIgnoreCase(leave.getStatus().getStatusName())
                    || leave.getLeaveType() == null || leave.getStartDate() == null) {
                continue;
            }
            BigDecimal total = nonNull(leave.getTotalDays());
            if (earliest == null || leave.getStartDate().isBefore(earliest)) {
                earliest = leave.getStartDate(); // bukti pertama bahwa karyawan ini dilacak
            }
            if (Boolean.TRUE.equals(leave.getLeaveType().getForfeiture())) {
                stored.add(new StoredForfeit(leave.getStartDate(), total));
            } else if (Boolean.TRUE.equals(leave.getLeaveType().getDeductsAnnualQuota())) {
                boolean imported = Boolean.TRUE.equals(leave.getImportedHistory());
                BigDecimal annualDays = imported
                        ? total
                        : total.subtract(nonNull(leave.getManualLeaveDays())).max(BigDecimal.ZERO);
                usages.add(new Usage(leave.getStartDate(), total, annualDays, imported));
            }
        }
        return new EmployeeLeaveData(usages, stored, earliest);
    }

    private static long nikAsNumber(String nik) {
        String digits = nik.replaceAll("\\D", "");
        return digits.isEmpty() ? Long.MAX_VALUE : Long.parseLong(digits);
    }

    private static BigDecimal nonNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
