package sys.hris.sims.leave.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.common.service.ReportScopeService;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.dto.LeaveBalanceResponse;
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

    public LocalDate today() {
        return LocalDate.now(ZONE);
    }

    @Transactional(readOnly = true)
    public List<LeaveSummaryResponse> getAllSummaries() {
        LocalDate today = today();
        return reportScopeService.onlyReportableEmployees(employeeRepository.findAll()).stream()
                // [UBAH] Urut NIK (angka), bukan nama. NIK kosong di akhir.
                .sorted(Comparator.comparing(Employee::getNikKaryawan,
                        Comparator.nullsLast(Comparator.comparingLong(LeaveSummaryService::nikAsNumber))))
                .map(employee -> summarize(employee, today))
                .toList();
    }

    @Transactional(readOnly = true)
    public LeaveSummaryResponse summarize(Employee employee, LocalDate today) {
        LeaveBalanceResponse balance = leaveService.getLeaveBalanceOf(employee);
        EmployeeLeaveData data = loadData(employee);
        List<Forfeit> forfeits = computeForfeits(employee, data, today);

        BigDecimal forfeited = forfeits.stream()
                .filter(item -> !item.expiryDate().isAfter(today))
                .map(Forfeit::days)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal used = usedSinceJoin(employee, data, today);
        BigDecimal remainingPrevious = nonNull(balance.getRemainingManualLeave());
        BigDecimal remainingCurrent = nonNull(balance.getRemainingAnnualLeave());
        BigDecimal available = remainingPrevious.add(remainingCurrent);

        return LeaveSummaryResponse.builder()
                .employeeId(employee.getEmployeeId())
                .employeeName(employee.getFullName())
                .nik(employee.getNikKaryawan())
                .divisionName(employee.getDivisi() == null ? null : employee.getDivisi().getNamaDivisi())
                .joinDate(employee.getJoinDate())
                .asOfDate(today)
                .totalOverallLeave(used.add(forfeited).add(available))
                .usedLeave(used)
                .forfeitedLeave(forfeited)
                .totalAvailableLeave(available)
                .remainingPreviousLeave(remainingPrevious)
                .remainingCurrentLeave(remainingCurrent)
                .build();
    }

    // Cuti hangus satu karyawan (tersimpan + dihitung) untuk periode yang sudah berakhir.
    @Transactional(readOnly = true)
    public List<Forfeit> computeForfeits(Employee employee, LocalDate today) {
        return computeForfeits(employee, loadData(employee), today);
    }

    private List<Forfeit> computeForfeits(Employee employee, EmployeeLeaveData data, LocalDate today) {
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
                employee.getAnnualUsedOutsidePeriodStart());
    }

    // Cuti yang memotong jatah sejak tanggal masuk sampai hari ini. Angka "terpakai di luar sistem"
    // ikut dihitung hanya bila periodenya belum punya riwayat tanggal hasil import (anti ganda).
    private BigDecimal usedSinceJoin(Employee employee, EmployeeLeaveData data, LocalDate today) {
        LocalDate joinDate = employee.getJoinDate();
        BigDecimal used = data.usages().stream()
                .filter(item -> (joinDate == null || !item.date().isBefore(joinDate)) && !item.date().isAfter(today))
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
