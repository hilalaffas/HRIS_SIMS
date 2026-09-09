package sys.hris.sims.leave.service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.holiday.repository.HolidayRepository;
import sys.hris.sims.leave.dto.LeaveApprovalLogResponse;
import sys.hris.sims.leave.dto.LeaveApprovalResponse;
import sys.hris.sims.leave.dto.LeaveBalanceResponse;
import sys.hris.sims.leave.dto.LeaveStepNotificationResponse;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.entity.LeaveRequestApproval;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.leave.repository.LeaveRequestApprovalRepository;
import sys.hris.sims.leavestatus.entity.LeaveStatus;
import sys.hris.sims.leavestatus.repository.LeaveStatusRepository;
import sys.hris.sims.leavetype.entity.LeaveType;
import sys.hris.sims.leavetype.repository.LeaveTypeRepository;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class LeaveService {
    private static final String ACTION_PENDING = "PENDING";
    private static final String ACTION_APPROVED = "APPROVED";
    private static final String ACTION_REJECTED = "REJECTED";
    private static final String ACTION_RETURNED = "RETURNED";
    private static final List<String> REQUIRED_APPROVER_ROLES = List.of("LEADER", "SPV", "MANAGER");
    private static final String ROLE_LEADER = "LEADER";
    private static final String ROLE_SPV = "SPV";
    private static final String ROLE_MANAGER = "MANAGER";
    // [BARU] Batas Cuti Melahirkan: Laki-laki (cuti pendamping) maksimal 2
    // hari kalender, Perempuan maksimal 3 bulan dari tanggal mulai.
    private static final int MATERNITY_MAX_DAYS_MALE = 2;
    private static final int MATERNITY_MAX_MONTHS_FEMALE = 3;
    // [BARU] Batas Cuti Meninggal: maksimal 2 hari kerja, tanggal merah dan
    // akhir pekan tidak dihitung (lihat validateSpecialLeaveLimits()).
    private static final int BEREAVEMENT_MAX_DAYS = 2;

    private final LeaveRepository cutiRepository;
    private final EmployeeRepository karyawanRepository;
    private final LeaveStatusRepository statusCutiRepository;
    private final LeaveRequestApprovalRepository approvalRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final UserRepository userRepository;
    private final HolidayRepository holidayRepository;

    public List<LeaveRequest> getAllCuti() {
        return cutiRepository.findAll();
    }

    public LeaveRequest getCutiById(Long id) {
        return cutiRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cuti tidak ditemukan"));
    }

    public List<LeaveRequest> getCutiByKaryawan(Long employeeId) {
        return cutiRepository.findByEmployee_EmployeeId(employeeId);
    }

    // Endpoint detail cuti untuk si pemohon sendiri, LENGKAP dengan info
    // approver (Leader/SPV/Manager). Data approver dipetakan lewat toApprovalResponse().
    public LeaveApprovalResponse getMyLeaveDetail(Long leaveRequestId, String username) {
        Employee requester = getEmployeeByUsername(username);
        LeaveRequest cuti = getCutiById(leaveRequestId);
        if (!cuti.getEmployee().getEmployeeId().equals(requester.getEmployeeId())) {
            throw new RuntimeException("Anda tidak memiliki akses ke detail cuti ini");
        }
        return toApprovalResponse(cuti, null);
    }

    // [BARU] Notifikasi lonceng utk karyawan pemohon: daftar tahap approval
    // (Leader/SPV/Manager) pada cuti MILIK SENDIRI yang SUDAH di-ACC salah
    // satu approver, tapi berkas secara keseluruhan masih PENDING (approver
    // lain belum bertindak). Dipakai Navbar.jsx supaya karyawan tahu progress
    // approval cuti mereka per tahap -- bukan cuma menunggu status akhir.
    // Begitu berkas final (APPROVED/REJECTED/RETURNED), baris terkait otomatis
    // tidak ikut lagi karena filter status masih PENDING di bawah ini.
    //
    // CATATAN: Sengaja mencakup SEMUA role approver (Leader/SPV/Manager) yang
    // approve -- bukan cuma Leader -- supaya karyawan tetap mendapat kabar di
    // tiap tahap. Untuk membatasi HANYA notifikasi saat Leader approve, tambahkan
    // filter role di .stream() di bawah, contoh:
    //   .filter(approval -> ROLE_LEADER.equals(approval.getApproverRole()))
    public List<LeaveStepNotificationResponse> getMyApprovalStepUpdates(String username) {
        Employee me = getEmployeeByUsername(username);

        return approvalRepository
                .findByLeaveRequest_Employee_EmployeeIdAndActionAndLeaveRequest_Status_StatusNameOrderByActedAtDesc(
                        me.getEmployeeId(), ACTION_APPROVED, ACTION_PENDING)
                .stream()
                .map(approval -> new LeaveStepNotificationResponse(
                        approval.getLeaveRequest().getLeaveRequestId(),
                        approval.getApprovalId(),
                        approval.getApproverRole(),
                        approval.getApproverEmployee() != null ? approval.getApproverEmployee().getFullName() : "-",
                        approval.getLeaveRequest().getLeaveType().getName(),
                        approval.getLeaveRequest().getStartDate(),
                        approval.getLeaveRequest().getEndDate(),
                        approval.getActedAt()))
                .toList();
    }

    public List<LeaveRequest> getCalendarLeaves(int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);
        return cutiRepository.findAll().stream()
                .filter(cuti -> !cuti.getEndDate().isBefore(start) && !cuti.getStartDate().isAfter(end))
                .filter(cuti -> ACTION_PENDING.equalsIgnoreCase(cuti.getStatus().getStatusName())
                        || ACTION_APPROVED.equalsIgnoreCase(cuti.getStatus().getStatusName()))
                .toList();
    }

    public LeaveRequest createCuti(LeaveRequest cuti) {
        return createCuti(cuti, null);
    }

    @Transactional
    public LeaveRequest createCuti(LeaveRequest cuti, String requesterUsername) {
        Employee requester = cuti.getEmployee();
        if (requester == null && requesterUsername != null) {
            requester = getEmployeeByUsername(requesterUsername);
            cuti.setEmployee(requester);
        } else if (requester != null && requester.getEmployeeId() != null) {
            requester = karyawanRepository.findById(requester.getEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Karyawan pemohon tidak ditemukan"));
            cuti.setEmployee(requester);
        }

        if (requester == null) {
            throw new RuntimeException("Karyawan pemohon wajib diisi");
        }

        validateSpecialLeaveLimits(cuti, requester);
        ensureNoOverlap(requester, cuti);

        BigDecimal totalDays = calculateLeaveDays(cuti);
        if (totalDays.signum() <= 0) {
            throw new RuntimeException("Rentang cuti harus memiliki minimal satu hari kerja");
        }

        cuti.setTotalDays(totalDays);
        cuti.setStatus(getStatus(ACTION_PENDING));

        LeaveRequest savedCuti = cutiRepository.save(cuti);
        createApprovalSteps(savedCuti, requester);
        return savedCuti;
    }

    /**
     * Cuti Darurat/Susulan yang diinput HR Admin/Super Admin atas nama karyawan
     */
    @Transactional
    public LeaveRequest createUrgentCuti(LeaveRequest cuti, String hrUsername) {
        if (cuti.getEmployee() == null || cuti.getEmployee().getEmployeeId() == null) {
            throw new RuntimeException("Karyawan yang diajukan cuti susulan wajib dipilih");
        }

        Employee targetEmployee = karyawanRepository.findById(cuti.getEmployee().getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Karyawan tidak ditemukan"));
        Employee hrActor = getEmployeeByUsername(hrUsername);

        cuti.setEmployee(targetEmployee);
        // [BARU] Sebelumnya alur Cuti Susulan/Darurat (HR input) TIDAK
        // divalidasi batas Cuti Meninggal/Melahirkan sama sekali -- HR bisa
        // input cuti meninggal 10 hari tanpa ditolak. Sekarang disamakan
        // dengan alur pengajuan mandiri karyawan.
        validateSpecialLeaveLimits(cuti, targetEmployee);
        ensureNoOverlap(targetEmployee, cuti);

        BigDecimal totalDays = calculateLeaveDays(cuti);
        if (totalDays.signum() <= 0) {
            throw new RuntimeException("Rentang cuti harus memiliki minimal satu hari kerja");
        }

        cuti.setTotalDays(totalDays);
        cuti.setStatus(getStatus(ACTION_APPROVED));
        cuti.setReviewedBy(hrActor);
        cuti.setReviewNote("Cuti darurat/susulan diinput oleh HR (" + hrActor.getFullName() + ") - auto-ACC");
        cuti.setApprovedAt(LocalDateTime.now());

        LeaveRequest savedCuti = cutiRepository.save(cuti);
        createApprovalStepsAutoApproved(savedCuti, targetEmployee, hrActor);
        return savedCuti;
    }

    private void ensureNoOverlap(Employee employee, LeaveRequest cuti) {
        List<LeaveRequest> existingCuti = cutiRepository.findByEmployee_EmployeeIdAndStatus_StatusNameIn(
                employee.getEmployeeId(),
                List.of(ACTION_PENDING, ACTION_APPROVED)
        );

        boolean isOverlap = existingCuti.stream().anyMatch(existing ->
                !cuti.getStartDate().isAfter(existing.getEndDate()) &&
                !cuti.getEndDate().isBefore(existing.getStartDate())
        );

        if (isOverlap) {
            throw new RuntimeException(employee.getFullName() + " sudah memiliki pengajuan cuti pada rentang tanggal yang bentrok");
        }
    }

    public LeaveRequest approveCuti(Long leaveRequestId, Long reviewerId) {
        Employee reviewer = karyawanRepository.findById(reviewerId)
                .orElseThrow(() -> new RuntimeException("Reviewer tidak ditemukan"));
        return approveCuti(leaveRequestId, reviewer.getUser().getUsername(), null);
    }

    public LeaveRequest approveCuti(Long leaveRequestId, String reviewerUsername, String note) {
        return processApprovalAction(leaveRequestId, reviewerUsername, ACTION_APPROVED, note);
    }

    public LeaveRequest rejectCuti(Long leaveRequestId, Long reviewerId, String note) {
        Employee reviewer = karyawanRepository.findById(reviewerId)
                .orElseThrow(() -> new RuntimeException("Reviewer tidak ditemukan"));
        return rejectCuti(leaveRequestId, reviewer.getUser().getUsername(), note);
    }

    public LeaveRequest rejectCuti(Long leaveRequestId, String reviewerUsername, String note) {
        return processApprovalAction(leaveRequestId, reviewerUsername, ACTION_REJECTED, note);
    }

    public LeaveRequest returnCuti(Long leaveRequestId, String reviewerUsername, String note) {
        return processApprovalAction(leaveRequestId, reviewerUsername, ACTION_RETURNED, note);
    }

    public List<LeaveApprovalResponse> getApprovalTasks(String username) {
        Employee approver = getCurrentApprover(username);
        return approvalRepository.findByApproverEmployee_EmployeeIdAndAction(approver.getEmployeeId(), ACTION_PENDING).stream()
                .map(LeaveRequestApproval::getLeaveRequest)
                .filter(cuti -> ACTION_PENDING.equalsIgnoreCase(cuti.getStatus().getStatusName()))
                .map(cuti -> toApprovalResponse(cuti, approver.getEmployeeId()))
                .toList();
    }

    public List<LeaveApprovalResponse> getApprovalHistory(String username, String status) {
        Employee approver = getCurrentApprover(username);
        return approvalRepository.findByApproverEmployee_EmployeeId(approver.getEmployeeId()).stream()
                .map(LeaveRequestApproval::getLeaveRequest)
                .distinct()
                .filter(cuti -> status == null || status.isBlank()
                        || cuti.getStatus().getStatusName().equalsIgnoreCase(status))
                .map(cuti -> toApprovalResponse(cuti, approver.getEmployeeId()))
                .toList();
    }

    // Endpoint detail satu berkas untuk atasan (Leader/SPV/Manager).
    public LeaveApprovalResponse getApprovalDetail(Long leaveRequestId, String username) {
        Employee approver = getCurrentApprover(username);
        boolean assignedToApprover = approvalRepository
                .findByLeaveRequest_LeaveRequestIdAndApproverEmployee_EmployeeId(leaveRequestId, approver.getEmployeeId())
                .isPresent();
        if (!assignedToApprover) {
            throw new RuntimeException("Anda tidak memiliki akses ke detail cuti ini");
        }
        return toApprovalResponse(getCutiById(leaveRequestId), approver.getEmployeeId());
    }

    public LeaveBalanceResponse getMyLeaveBalance(String username) {
        return getLeaveBalance(getEmployeeByUsername(username));
    }

    // [BARU] Dipakai HR/Admin untuk melihat sisa cuti tahunan karyawan LAIN
    // (form Manajemen Data Pegawai). Logikanya sengaja disatukan lewat
    // getLeaveBalance(Employee) di bawah, supaya endpoint "punya sendiri"
    // dan "punya orang lain" selalu konsisten satu sama lain.
    public LeaveBalanceResponse getLeaveBalanceByEmployeeId(Long employeeId) {
        Employee employee = karyawanRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Karyawan tidak ditemukan"));
        return getLeaveBalance(employee);
    }

    // [BARU] Hitung Total sisa cuti (Tahunan + Lama) SEMUA karyawan
    // sekaligus, dipakai endpoint /api/cuti/balance/all untuk tabel
    // Direktori Karyawan. Reuse getLeaveBalance(Employee) yang sama persis
    // dipakai /balance/me & /balance/{employeeId}, supaya 3-3nya selalu
    // konsisten satu sama lain.
    public List<LeaveBalanceResponse> getAllLeaveBalances() {
        return karyawanRepository.findAll().stream()
                .map(this::getLeaveBalance)
                .toList();
    }

    // [UBAH] Sekarang menghitung 3 hal: (1) Cuti Tahunan otomatis per-periode
    // ANNIVERSARY (bukan tahun kalender) -- baru berhak 1 tahun setelah
    // joinDate, refresh tiap tahun ikut tanggal join, dan DEFISIT/kelebihan
    // pemakaian di suatu periode dibawa (mengurangi kuota) ke periode
    // berikutnya -- lihat calculateCarryAdjustedAnnualQuota(). (2) Sisa Cuti
    // (manual, dari HR) -- dihitung ULANG dari histori seperti Cuti Tahunan,
    // BUKAN saldo yang dikurangi langsung, supaya otomatis selalu benar walau
    // ada cuti yang dibatalkan/dihapus. (3) Prioritas potongan: Sisa Cuti
    // (manual) dipakai HABIS dulu sebelum Cuti Tahunan tersentuh -- berlaku
    // utk semua jenis cuti yang deductsAnnualQuota = true (Cuti tahunan, Cuti
    // Urgent, Cuti setengah hari).
    private LeaveBalanceResponse getLeaveBalance(Employee employee) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Jakarta"));
        LocalDate joinDate = employee.getJoinDate();

        // Semua cuti approved yang memotong kuota, diurutkan dari tanggal
        // mulai paling awal -- urutan ini menentukan mana yang duluan
        // "menghabiskan" Sisa Cuti (manual) sebelum jatuh ke Cuti Tahunan.
        List<LeaveRequest> relevantApprovedLeaves = getCutiByKaryawan(employee.getEmployeeId()).stream()
                .filter(cuti -> ACTION_APPROVED.equalsIgnoreCase(cuti.getStatus().getStatusName()))
                .filter(cuti -> Boolean.TRUE.equals(cuti.getLeaveType().getDeductsAnnualQuota()))
                .sorted(Comparator.comparing(LeaveRequest::getStartDate)
                        .thenComparing(LeaveRequest::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        // --- Sisa Cuti (manual): dihitung ulang dari SELURUH histori di atas,
        // TIDAK dibatasi periode tahunan (pool ini tidak refresh tiap tahun).
        // [UBAH] employee.getManualLeaveBalance() sekarang bertipe BigDecimal
        // langsung (V24__change_manual_leave_balance_to_decimal.sql), jadi
        // tidak perlu lagi dibungkus BigDecimal.valueOf(int).
        BigDecimal manualAllocated = employee.getManualLeaveBalance() == null
                ? BigDecimal.ZERO
                : employee.getManualLeaveBalance();
        BigDecimal manualPoolRemaining = manualAllocated;
        Map<Long, BigDecimal> annualPortionByRequestId = new HashMap<>();

        for (LeaveRequest cuti : relevantApprovedLeaves) {
            BigDecimal totalDays = cuti.getTotalDays() == null ? BigDecimal.ZERO : cuti.getTotalDays();
            BigDecimal fromManual = manualPoolRemaining.min(totalDays).max(BigDecimal.ZERO);
            BigDecimal fromAnnual = totalDays.subtract(fromManual);
            manualPoolRemaining = manualPoolRemaining.subtract(fromManual);
            annualPortionByRequestId.put(cuti.getLeaveRequestId(), fromAnnual);
        }

        BigDecimal remainingManualLeave = manualPoolRemaining.max(BigDecimal.ZERO);
        boolean belumBerhakCutiTahunan = joinDate == null || joinDate.plusYears(1).isAfter(today);

        if (belumBerhakCutiTahunan) {
            // [BARU] Sisa Cuti (manual) tetap bisa dipakai walau karyawan
            // belum genap 1 tahun kerja -- yang 0 hanya porsi Cuti Tahunan.
            return LeaveBalanceResponse.builder()
                    .employeeId(employee.getEmployeeId())
                    .employeeName(employee.getFullName())
                    .annualQuota(BigDecimal.ZERO)
                    .usedAnnualLeave(BigDecimal.ZERO)
                    .remainingAnnualLeave(BigDecimal.ZERO)
                    .annualPeriodEnd(null)
                    .annualEligibleFrom(joinDate == null ? null : joinDate.plusYears(1))
                    .manualLeaveAllocated(manualAllocated)
                    .remainingManualLeave(remainingManualLeave)
                    .totalRemainingLeave(remainingManualLeave)
                    .build();
        }

        LeaveType annualLeave = leaveTypeRepository.findByNameIgnoreCase("Cuti tahunan")
                .orElse(null);
        BigDecimal baseAnnualQuota = BigDecimal.valueOf(getAnnualQuota(employee, annualLeave));

        // Tentukan periode cuti tahunan yang SEDANG berjalan (anniversary-based).
        // Contoh: join 15 Mar 2023 & hari ini 20 Jul 2026 -> tahunKerjaPenuh = 3,
        // periodeMulai = 15 Mar 2026, periodeSelesai = 15 Mar 2027.
        long tahunKerjaPenuh = ChronoUnit.YEARS.between(joinDate, today);
        LocalDate periodeMulai = joinDate.plusYears(tahunKerjaPenuh);
        LocalDate periodeSelesai = periodeMulai.plusYears(1);

        // Hitung kuota pembuka periode berjalan dengan membawa hanya DEFISIT
        // dari periode sebelumnya. Dengan cara ini tidak perlu kolom saldo baru
        // di database: defisit dapat direkonstruksi dari histori approved leave.
        BigDecimal annualQuota = calculateCarryAdjustedAnnualQuota(
                baseAnnualQuota,
                joinDate,
                periodeMulai,
                relevantApprovedLeaves,
                annualPortionByRequestId
        );

        // [UBAH] usedAnnualLeave sekarang menjumlahkan "porsi tahunan" tiap
        // cuti (annualPortionByRequestId), bukan totalDays mentah -- supaya
        // hari yang sudah kepotong dari Sisa Cuti tidak ikut mengurangi
        // Cuti Tahunan juga (mencegah dobel potong).
        BigDecimal usedAnnualLeave = relevantApprovedLeaves.stream()
                .filter(cuti -> !cuti.getStartDate().isBefore(periodeMulai) && cuti.getStartDate().isBefore(periodeSelesai))
                .map(cuti -> annualPortionByRequestId.getOrDefault(cuti.getLeaveRequestId(), BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // PENTING: JANGAN di-clamp ke 0. Nilai minus adalah defisit tahun berjalan
        // dan akan mengurangi kuota pada anniversary berikutnya.
        BigDecimal remainingAnnualLeave = annualQuota.subtract(usedAnnualLeave);

        return LeaveBalanceResponse.builder()
                .employeeId(employee.getEmployeeId())
                .employeeName(employee.getFullName())
                .annualQuota(annualQuota)
                .usedAnnualLeave(usedAnnualLeave)
                .remainingAnnualLeave(remainingAnnualLeave)
                .annualPeriodEnd(periodeSelesai)
                .annualEligibleFrom(null)
                .manualLeaveAllocated(manualAllocated)
                .remainingManualLeave(remainingManualLeave)
                .totalRemainingLeave(remainingAnnualLeave.add(remainingManualLeave))
                .build();
    }

    /**
     * Menghitung kuota pembuka periode berjalan dengan aturan carry-over defisit.
     *
     * Periode pertama dimulai saat karyawan genap 1 tahun. Untuk setiap periode
     * historis sebelum periode aktif:
     *   opening = baseQuota + previousDeficit
     *   ending  = opening - annualUsage
     *   nextDeficit = min(ending, 0)
     *
     * Sisa positif tidak dibawa. Hanya saldo negatif (kelebihan cuti) yang
     * mengurangi kuota pada anniversary berikutnya.
     */
    private BigDecimal calculateCarryAdjustedAnnualQuota(
            BigDecimal baseQuota,
            LocalDate joinDate,
            LocalDate currentPeriodStart,
            List<LeaveRequest> approvedLeaves,
            Map<Long, BigDecimal> annualPortionByRequestId) {

        BigDecimal previousDeficit = BigDecimal.ZERO;
        LocalDate periodStart = joinDate.plusYears(1);

        while (periodStart.isBefore(currentPeriodStart)) {
            LocalDate periodEnd = periodStart.plusYears(1);
            final LocalDate periodStartFinal = periodStart; // effectively final untuk lambda
            BigDecimal openingQuota = baseQuota.add(previousDeficit);

            BigDecimal usedInPeriod = approvedLeaves.stream()
                    .filter(cuti -> !cuti.getStartDate().isBefore(periodStartFinal)
                            && cuti.getStartDate().isBefore(periodEnd))
                    .map(cuti -> annualPortionByRequestId.getOrDefault(cuti.getLeaveRequestId(), BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal endingBalance = openingQuota.subtract(usedInPeriod);
            previousDeficit = endingBalance.min(BigDecimal.ZERO);
            periodStart = periodEnd;
        }

        return baseQuota.add(previousDeficit);
    }

    public void deleteCuti(Long id) {
        LeaveRequest cuti = getCutiById(id);
        cutiRepository.delete(cuti);
    }

    @Transactional
    public LeaveRequest resubmitCuti(Long leaveRequestId, LeaveRequest updatedCuti, String requesterUsername) {
        LeaveRequest existingCuti = getCutiById(leaveRequestId);
        Employee requester = getEmployeeByUsername(requesterUsername);

        if (!existingCuti.getEmployee().getEmployeeId().equals(requester.getEmployeeId())) {
            throw new RuntimeException("Hanya pemohon yang dapat mengedit cuti ini");
        }
        if (!ACTION_RETURNED.equalsIgnoreCase(existingCuti.getStatus().getStatusName())) {
            throw new RuntimeException("Hanya cuti berstatus dikembalikan yang dapat diedit");
        }
        if (updatedCuti.getLeaveType() == null || updatedCuti.getLeaveType().getLeaveTypeId() == null) {
            throw new RuntimeException("Jenis cuti wajib dipilih");
        }
        if (updatedCuti.getStartDate() == null || updatedCuti.getEndDate() == null
                || updatedCuti.getEndDate().isBefore(updatedCuti.getStartDate())) {
            throw new RuntimeException("Rentang tanggal cuti tidak valid");
        }

        existingCuti.setLeaveType(leaveTypeRepository.findById(updatedCuti.getLeaveType().getLeaveTypeId())
                .orElseThrow(() -> new RuntimeException("Jenis cuti tidak ditemukan")));
        existingCuti.setStartDate(updatedCuti.getStartDate());
        existingCuti.setEndDate(updatedCuti.getEndDate());
        validateSpecialLeaveLimits(existingCuti, requester);
        BigDecimal totalDays = calculateLeaveDays(existingCuti);
        if (totalDays.signum() <= 0) {
            throw new RuntimeException("Rentang cuti harus memiliki minimal satu hari kerja");
        }
        existingCuti.setTotalDays(totalDays);
        // [BARU] Sebelumnya TIDAK ada baris ini -- session lama tidak pernah
        // ter-update saat resubmit, karena method ini copy field satu per
        // satu (bukan save entity utuh seperti createCuti()).
        existingCuti.setSession(updatedCuti.getSession());
        existingCuti.setReason(updatedCuti.getReason());
        existingCuti.setPendingWork(updatedCuti.getPendingWork());
        existingCuti.setCoveredBy(updatedCuti.getCoveredBy());
        existingCuti.setLeaderEmployeeId(updatedCuti.getLeaderEmployeeId());
        existingCuti.setSpvEmployeeId(updatedCuti.getSpvEmployeeId());
        existingCuti.setManagerEmployeeId(updatedCuti.getManagerEmployeeId());
        existingCuti.setStatus(getStatus(ACTION_PENDING));
        existingCuti.setReviewedBy(null);
        existingCuti.setReviewNote(null);
        existingCuti.setApprovedAt(null);
        existingCuti.setReturnedAt(null);
        existingCuti.setSubmittedAt(LocalDateTime.now());

        approvalRepository.deleteAll(approvalRepository.findByLeaveRequest_LeaveRequestId(leaveRequestId));
        approvalRepository.flush();
        LeaveRequest savedCuti = cutiRepository.save(existingCuti);
        createApprovalSteps(savedCuti, requester);
        return savedCuti;
    }

    private LeaveRequest processApprovalAction(Long leaveRequestId, String reviewerUsername, String action, String note) {
        if (note == null || note.isBlank()) {
            throw new RuntimeException("Catatan approval wajib diisi");
        }

        LeaveRequest cuti = getCutiById(leaveRequestId);
        Employee reviewer = getEmployeeByUsername(reviewerUsername);
        String approverRole = normalizeApproverRole(reviewer.getUser().getRoleId().getRoleName());

        if (!REQUIRED_APPROVER_ROLES.contains(approverRole)) {
            throw new RuntimeException("Role ini tidak memiliki akses approval cuti");
        }

        if (!ACTION_PENDING.equalsIgnoreCase(cuti.getStatus().getStatusName())) {
            throw new RuntimeException("Cuti ini sudah tidak dalam status pending");
        }

        LeaveRequestApproval approval = approvalRepository
                .findByLeaveRequest_LeaveRequestIdAndApproverEmployee_EmployeeId(leaveRequestId, reviewer.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Approval untuk user ini tidak ditemukan"));

        if (!approverRole.equalsIgnoreCase(approval.getApproverRole())) {
            throw new RuntimeException("Role user login tidak sesuai dengan approval yang ditugaskan");
        }

        if (!ACTION_PENDING.equalsIgnoreCase(approval.getAction())) {
            throw new RuntimeException("Role ini sudah melakukan tindakan untuk cuti ini");
        }

        approval.setAction(action);
        approval.setApproverEmployee(reviewer);
        approval.setNote(note);
        approval.setActedAt(LocalDateTime.now());
        approvalRepository.save(approval);

        cuti.setReviewedBy(reviewer);
        cuti.setReviewNote(note);

        if (ACTION_REJECTED.equals(action)) {
            cuti.setStatus(getStatus(ACTION_REJECTED));
            cuti.setApprovedAt(LocalDateTime.now());
        } else if (ACTION_RETURNED.equals(action)) {
            cuti.setStatus(getStatus(ACTION_RETURNED));
            cuti.setReturnedAt(LocalDateTime.now());
        } else if (isAllApprovalsApproved(leaveRequestId)) {
            cuti.setStatus(getStatus(ACTION_APPROVED));
            cuti.setApprovedAt(LocalDateTime.now());
        }

        return cutiRepository.save(cuti);
    }

    private void createApprovalSteps(LeaveRequest cuti, Employee requester) {
        List<LeaveRequestApproval> approvals = new ArrayList<>();
        String requesterRole = normalizeApproverRole(requester.getUser().getRoleId().getRoleName());

        if (REQUIRED_APPROVER_ROLES.contains(requesterRole)) {
            if (hasValue(cuti.getLeaderEmployeeId()) || hasValue(cuti.getSpvEmployeeId())) {
                throw new RuntimeException("Cuti Leader/SPV/Manager hanya boleh memilih approver Manager");
            }

            Employee manager = getSelectedApprover(cuti.getManagerEmployeeId(), ROLE_MANAGER, requester);
            if (manager.getEmployeeId().equals(requester.getEmployeeId())) {
                throw new RuntimeException("Manager tidak boleh approve cuti miliknya sendiri");
            }
            approvals.add(buildApproval(cuti, ROLE_MANAGER, manager));
        } else {
            approvals.add(buildApproval(cuti, ROLE_LEADER, getSelectedApprover(cuti.getLeaderEmployeeId(), ROLE_LEADER, requester)));
            approvals.add(buildApproval(cuti, ROLE_SPV, getSelectedApprover(cuti.getSpvEmployeeId(), ROLE_SPV, requester)));
            approvals.add(buildApproval(cuti, ROLE_MANAGER, getSelectedApprover(cuti.getManagerEmployeeId(), ROLE_MANAGER, requester)));
        }

        approvalRepository.saveAll(approvals);
    }

    /**
     * Versi auto-approved dari createApprovalSteps, khusus alur Cuti Susulan/Darurat
     */
    private void createApprovalStepsAutoApproved(LeaveRequest cuti, Employee targetEmployee, Employee hrActor) {
        List<LeaveRequestApproval> approvals = new ArrayList<>();
        String targetRole = normalizeApproverRole(targetEmployee.getUser().getRoleId().getRoleName());
        String autoNote = "Auto-ACC — cuti susulan diinput HR (" + hrActor.getFullName() + ")";
        LocalDateTime actedAt = LocalDateTime.now();

        if (REQUIRED_APPROVER_ROLES.contains(targetRole)) {
            if (hasValue(cuti.getLeaderEmployeeId()) || hasValue(cuti.getSpvEmployeeId())) {
                throw new RuntimeException("Karyawan berperan Leader/SPV/Manager, cukup pilih approver Manager saja");
            }
            Employee manager = getSelectedApprover(cuti.getManagerEmployeeId(), ROLE_MANAGER, targetEmployee);
            approvals.add(buildApproval(cuti, ROLE_MANAGER, manager, ACTION_APPROVED, autoNote, actedAt));
        } else {
            approvals.add(buildApproval(cuti, ROLE_LEADER, getSelectedApprover(cuti.getLeaderEmployeeId(), ROLE_LEADER, targetEmployee), ACTION_APPROVED, autoNote, actedAt));
            approvals.add(buildApproval(cuti, ROLE_SPV, getSelectedApprover(cuti.getSpvEmployeeId(), ROLE_SPV, targetEmployee), ACTION_APPROVED, autoNote, actedAt));
            approvals.add(buildApproval(cuti, ROLE_MANAGER, getSelectedApprover(cuti.getManagerEmployeeId(), ROLE_MANAGER, targetEmployee), ACTION_APPROVED, autoNote, actedAt));
        }

        approvalRepository.saveAll(approvals);
    }

    private boolean isAllApprovalsApproved(Long leaveRequestId) {
        Map<String, String> actionsByRole = approvalRepository.findByLeaveRequest_LeaveRequestId(leaveRequestId)
                .stream()
                .collect(Collectors.toMap(
                        LeaveRequestApproval::getApproverRole,
                        LeaveRequestApproval::getAction,
                        (existing, replacement) -> existing
                ));

        return !actionsByRole.isEmpty() && actionsByRole.values().stream()
                .allMatch(ACTION_APPROVED::equals);
    }

    private LeaveApprovalResponse toApprovalResponse(LeaveRequest cuti, Long currentEmployeeId) {
        List<LeaveRequestApproval> approvals = approvalRepository.findByLeaveRequest_LeaveRequestId(cuti.getLeaveRequestId());
        String myApprovalStatus = approvals.stream()
                .filter(approval -> approval.getApproverEmployee() != null
                        && approval.getApproverEmployee().getEmployeeId().equals(currentEmployeeId))
                .map(LeaveRequestApproval::getAction)
                .findFirst()
                .orElse(null);

        List<LeaveApprovalLogResponse> logs = approvals.stream()
                .map(approval -> new LeaveApprovalLogResponse(
                        approval.getApproverRole(),
                        approval.getAction(),
                        approval.getApproverEmployee() == null ? null : approval.getApproverEmployee().getFullName(),
                        approval.getNote(),
                        approval.getActedAt()
                ))
                .toList();

        // Mengambil data Leader, SPV, dan Manager dari tabel approvals
        Employee leader = approvals.stream().filter(a->ROLE_LEADER.equals(a.getApproverRole())).map(LeaveRequestApproval::getApproverEmployee).findFirst().orElse(null);
        Employee spv = approvals.stream().filter(a->ROLE_SPV.equals(a.getApproverRole())).map(LeaveRequestApproval::getApproverEmployee).findFirst().orElse(null);
        Employee manager = approvals.stream().filter(a->ROLE_MANAGER.equals(a.getApproverRole())).map(LeaveRequestApproval::getApproverEmployee).findFirst().orElse(null);

        return new LeaveApprovalResponse(
                cuti.getLeaveRequestId(),
                cuti.getEmployee().getEmployeeId(),
                cuti.getEmployee().getFullName(),
                cuti.getLeaveType().getName(),
                cuti.getStartDate(),
                cuti.getEndDate(),
                cuti.getTotalDays(),
                // [BARU] Diteruskan ke LeaveApprovalResponse supaya frontend
                // (LeaveDetailModal.jsx, Form.jsx approval) bisa menampilkan
                // keterangan Sesi Pagi/Siang untuk Cuti setengah hari.
                cuti.getSession(),
                cuti.getReason(),
                cuti.getPendingWork(),
                cuti.getCoveredBy(),
                // Data approver ditambahkan
                leader==null?null:leader.getEmployeeId(),
                leader==null?null:leader.getFullName(),
                spv==null?null:spv.getEmployeeId(),
                spv==null?null:spv.getFullName(),
                manager==null?null:manager.getEmployeeId(),
                manager==null?null:manager.getFullName(),
                cuti.getSubmittedAt(),
                cuti.getStatus().getStatusName(),
                myApprovalStatus,
                cuti.getReviewNote(),
                logs
        );
    }

    private Employee getCurrentApprover(String username) {
        Employee employee = getEmployeeByUsername(username);
        String role = normalizeApproverRole(employee.getUser().getRoleId().getRoleName());

        if (!REQUIRED_APPROVER_ROLES.contains(role)) {
            throw new RuntimeException("Role ini tidak memiliki akses approval cuti");
        }

        return employee;
    }

    private Employee getEmployeeByUsername(String username) {
        return karyawanRepository.findFirstByUser_Username(username)
                .orElseGet(() -> createEmployeeProfileForExistingUser(username));
    }

    private Employee createEmployeeProfileForExistingUser(String username) {
        User user = userRepository.findByUsername(username);
        if (user == null) {
            throw new RuntimeException("User login tidak ditemukan");
        }

        Employee employee = Employee.builder()
                .user(user)
                .fullName(user.getUsername())
                .gender("L")
                .isActive(true)
                .build();

        return karyawanRepository.save(employee);
    }

    private LeaveStatus getStatus(String statusName) {
        return statusCutiRepository.findByStatusNameIgnoreCase(statusName)
                .orElseThrow(() -> new RuntimeException("Status cuti " + statusName + " tidak ditemukan"));
    }

    private Integer getAnnualQuota(Employee employee, LeaveType annualLeave) {
        if (annualLeave == null) {
            return 12;
        }

        if ("F".equalsIgnoreCase(employee.getGender()) || "P".equalsIgnoreCase(employee.getGender())) {
            return annualLeave.getQuotaFemale();
        }

        return annualLeave.getQuotaMale();
    }

    // [UBAH] Sebelumnya validateCutiMelahirkanLimit() -- HANYA menangani Cuti
    // Melahirkan. Sekarang jadi validateSpecialLeaveLimits() dan menambahkan
    // penanganan Cuti Meninggal (maksimal BEREAVEMENT_MAX_DAYS hari KERJA,
    // tanggal merah/akhir pekan tidak dihitung). Nama & seluruh pemanggilnya
    // (createCuti/createUrgentCuti/resubmitCuti) ikut disesuaikan.
    // Laki-laki (dianggap cuti pendamping melahirkan) dibatasi maksimal
    // MATERNITY_MAX_DAYS_MALE hari KERJA (sebelumnya hari kalender -- lihat
    // catatan di calculateLeaveDays()), sedangkan Perempuan dibatasi maksimal
    // MATERNITY_MAX_MONTHS_FEMALE bulan dari tanggal mulai.
    // Dicek berdasarkan nama jenis cuti (mengandung kata "melahirkan"/
    // "meninggal"), supaya tetap berlaku walau nama tepatnya mis. "Cuti
    // Melahirkan (Khusus)".
    private void validateSpecialLeaveLimits(LeaveRequest cuti, Employee requester) {
        String leaveTypeName = cuti.getLeaveType() == null ? "" : cuti.getLeaveType().getName();
        String normalizedLeaveTypeName = leaveTypeName == null ? "" : leaveTypeName.toLowerCase(Locale.ROOT);
        if (cuti.getStartDate() == null || cuti.getEndDate() == null) {
            return;
        }

        // [BARU] Cuti Meninggal: maksimal BEREAVEMENT_MAX_DAYS hari kerja.
        if (normalizedLeaveTypeName.contains("meninggal")) {
            int totalHariKerja = calculateWorkingDays(cuti.getStartDate(), cuti.getEndDate());
            if (totalHariKerja > BEREAVEMENT_MAX_DAYS) {
                throw new RuntimeException("Cuti meninggal maksimal " + BEREAVEMENT_MAX_DAYS + " hari kerja");
            }
            return;
        }

        if (!normalizedLeaveTypeName.contains("melahirkan")) {
            return;
        }

        boolean isPerempuan = "F".equalsIgnoreCase(requester.getGender()) || "P".equalsIgnoreCase(requester.getGender());

        if (isPerempuan) {
            LocalDate batasMaxTanggal = cuti.getStartDate().plusMonths(MATERNITY_MAX_MONTHS_FEMALE);
            if (cuti.getEndDate().isAfter(batasMaxTanggal)) {
                throw new RuntimeException("Cuti melahirkan untuk karyawan perempuan maksimal "
                        + MATERNITY_MAX_MONTHS_FEMALE + " bulan sejak tanggal mulai");
            }
        } else {
            // [UBAH] Sebelumnya hari KALENDER (ChronoUnit.DAYS). Sekarang
            // hari KERJA (calculateWorkingDays), konsisten dengan
            // calculateLeaveDays() supaya pesan error & total hari yang
            // benar-benar terpotong dari saldo selalu sinkron.
            int totalHariKerja = calculateWorkingDays(cuti.getStartDate(), cuti.getEndDate());
            if (totalHariKerja > MATERNITY_MAX_DAYS_MALE) {
                throw new RuntimeException("Cuti melahirkan (pendamping) untuk karyawan laki-laki maksimal "
                        + MATERNITY_MAX_DAYS_MALE + " hari kerja");
            }
        }
    }

    private BigDecimal calculateLeaveDays(LeaveRequest cuti) {
        String leaveTypeName = cuti.getLeaveType() == null ? "" : cuti.getLeaveType().getName();
        String normalizedLeaveTypeName = leaveTypeName == null ? "" : leaveTypeName.toLowerCase(Locale.ROOT);

        if ("cuti setengah hari".equals(normalizedLeaveTypeName)) {
            if (!cuti.getStartDate().equals(cuti.getEndDate())) {
                throw new RuntimeException("Cuti setengah hari hanya dapat diajukan untuk satu tanggal");
            }
            return new BigDecimal("0.5");
        }

        // [UBAH] Cuti Melahirkan PEREMPUAN tetap dihitung hari KALENDER
        // (konsisten dengan batas 3 bulan yang tidak boleh terpotong akhir
        // pekan/hari libur). Cuti Melahirkan LAKI-LAKI (pendamping) sekarang
        // ikut hari KERJA seperti jenis cuti lain -- sebelumnya sama-sama
        // hari kalender, padahal batasnya (MATERNITY_MAX_DAYS_MALE) sudah
        // diubah jadi hari kerja di validateSpecialLeaveLimits().
        boolean isMelahirkan = normalizedLeaveTypeName.contains("melahirkan");
        boolean isPemohonPerempuan = cuti.getEmployee() != null
                && ("F".equalsIgnoreCase(cuti.getEmployee().getGender())
                        || "P".equalsIgnoreCase(cuti.getEmployee().getGender()));
        if (isMelahirkan && isPemohonPerempuan) {
            long totalHariKalender = ChronoUnit.DAYS.between(cuti.getStartDate(), cuti.getEndDate()) + 1;
            return totalHariKalender > 0 ? BigDecimal.valueOf(totalHariKalender) : BigDecimal.ZERO;
        }

        int workingDays = calculateWorkingDays(cuti.getStartDate(), cuti.getEndDate());
        if (workingDays <= 0) {
            return BigDecimal.ZERO;
        }

        return BigDecimal.valueOf(workingDays);
    }

    private String normalizeApproverRole(String roleName) {
        return roleName == null ? "" : roleName.trim().toUpperCase(Locale.ROOT);
    }

    private boolean hasValue(Long value) {
        return value != null && value > 0;
    }

    private Employee getSelectedApprover(Long employeeId, String expectedRole, Employee requester) {
        if (!hasValue(employeeId)) {
            throw new RuntimeException("Approver " + expectedRole + " wajib dipilih");
        }

        Employee employee = karyawanRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Approver " + expectedRole + " tidak ditemukan"));
        String role = normalizeApproverRole(employee.getUser().getRoleId().getRoleName());

        if (!expectedRole.equals(role)) {
            throw new RuntimeException("Approver yang dipilih harus memiliki role " + expectedRole);
        }

        if (!Boolean.TRUE.equals(employee.getIsActive())) {
            throw new RuntimeException("Approver " + expectedRole + " sudah tidak aktif");
        }

        if (requester.getDivisi() == null) {
            throw new RuntimeException("Divisi pemohon belum ditentukan");
        }
        if (employee.getDivisi() == null
                || !requester.getDivisi().getId().equals(employee.getDivisi().getId())) {
            throw new RuntimeException("Approver " + expectedRole + " harus berasal dari divisi yang sama dengan pemohon");
        }

        return employee;
    }

    private int calculateWorkingDays(LocalDate startDate, LocalDate endDate) {
        Set<LocalDate> holidays = holidayRepository.findByDateBetweenOrderByDateAsc(startDate, endDate).stream()
                .map(holiday -> holiday.getDate())
                .collect(Collectors.toSet());

        int total = 0;
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            DayOfWeek day = date.getDayOfWeek();
            boolean weekend = day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
            if (!weekend && !holidays.contains(date)) {
                total++;
            }
        }
        return total;
    }

    private LeaveRequestApproval buildApproval(LeaveRequest cuti, String role, Employee approver) {
        return buildApproval(cuti, role, approver, ACTION_PENDING, null, null);
    }

    // Overload untuk baris approval yang langsung final (Cuti Susulan HR auto-ACC)
    private LeaveRequestApproval buildApproval(LeaveRequest cuti, String role, Employee approver, String action, String note, LocalDateTime actedAt) {
        return LeaveRequestApproval.builder()
                .leaveRequest(cuti)
                .approverRole(role)
                .approverEmployee(approver)
                .action(action)
                .note(note)
                .actedAt(actedAt)
                .build();
    }
}