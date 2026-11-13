package sys.hris.sims.leave.service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.devtools.service.DevAccessService;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.holiday.repository.HolidayRepository;
import sys.hris.sims.leave.dto.LeaveApprovalLogResponse;
import sys.hris.sims.leave.dto.LeaveApprovalResponse;
import sys.hris.sims.leave.dto.LeaveBalanceResponse;
import sys.hris.sims.leave.dto.LeaveCoverageReminderResponse;
import sys.hris.sims.leave.dto.LeaveStepNotificationResponse;
import sys.hris.sims.attendance.service.LeaveAttendancePolicy;
import sys.hris.sims.common.service.HrdApproverPolicy;
import sys.hris.sims.common.service.ReportScopeService;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.entity.LeaveRequestApproval;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.leave.repository.LeaveRequestApprovalRepository;
import sys.hris.sims.leavestatus.entity.LeaveStatus;
import sys.hris.sims.leavestatus.repository.LeaveStatusRepository;
import sys.hris.sims.leavetype.entity.LeaveType;
import sys.hris.sims.leavetype.repository.LeaveTypeRepository;
import sys.hris.sims.notification.service.NotificationService;
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
    // [BARU] Pengajuan baru hanya punya SATU tahap: HRD. LEADER/SPV/MANAGER di atas tetap
    // dikenali supaya pengajuan lama yang masih PENDING bisa diselesaikan dengan alur lamanya.
    private static final String ROLE_HRD = HrdApproverPolicy.STAGE_ROLE;
    private static final List<String> APPROVAL_STAGE_ROLES = List.of(ROLE_LEADER, ROLE_SPV, ROLE_MANAGER, ROLE_HRD);
    // [BARU] Batas Cuti Melahirkan: Laki-laki (cuti pendamping) maksimal 2
    // hari kalender, Perempuan maksimal 3 bulan dari tanggal mulai.
    private static final int MATERNITY_MAX_DAYS_MALE = 2;
    private static final int MATERNITY_MAX_MONTHS_FEMALE = 3;
    // [BARU] Batas Cuti Meninggal: maksimal 2 hari kerja, tanggal merah dan
    // akhir pekan tidak dihitung (lihat validateCutiMeninggalLimit()).
    private static final int BEREAVEMENT_MAX_DAYS = 2;
    // [BARU] Batas Cuti Nikah: maksimal 3 hari kerja, sama untuk semua
    // gender (lihat validateCutiNikahLimit()).
    private static final int MARRIAGE_MAX_DAYS = 3;

    private final LeaveRepository cutiRepository;
    private final EmployeeRepository karyawanRepository;
    private final LeaveStatusRepository statusCutiRepository;
    private final LeaveRequestApprovalRepository approvalRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final UserRepository userRepository;
    private final HolidayRepository holidayRepository;
    private final LeaveAttendancePolicy leaveAttendancePolicy; // [BARU] hapus absen di tanggal cuti saat disetujui
    private final ReportScopeService reportScopeService; // [BARU] sembunyikan superadmin & akun dev dari laporan
    private final NotificationService notificationService; // [BARU] notifikasi lonceng disimpan di database
    private final HrdApproverPolicy hrdApproverPolicy; // [BARU] aturan approver HRD

    // [UBAH] Sumber data tab "Cuti Karyawan" & ekspor cuti: pengajuan milik
    // SUPER_ADMIN / akun dev tidak ditampilkan, hanya karyawan asli.
    public List<LeaveRequest> getAllCuti() {
        return cutiRepository.findAllWithDetails().stream() // [UBAH] 1 query (findAll() memicu N+1)
                .filter(cuti -> !reportScopeService.isExcludedFromReports(cuti.getEmployee()))
                .toList();
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

    // [BARU] Reminder "Dicover Oleh" untuk user yang sedang login: daftar
    // pengajuan cuti REKAN LAIN (PENDING/APPROVED) yang mencantumkan nama
    // user ini di kolom "Dicover Oleh". Dipakai form Ajukan Cuti
    // (ApplyCuti.jsx) supaya karyawan diingatkan bahwa dirinya sudah
    // punya tanggung jawab cover sebelum mengajukan cutinya sendiri --
    // terutama kalau tanggalnya bertabrakan. Hanya rentang tanggal yang
    // belum lewat (endDate >= hari ini) yang disertakan, supaya reminder
    // tidak menumpuk dengan kewajiban cover yang sudah selesai.
    public List<LeaveCoverageReminderResponse> getMyCoverageReminders(String username) {
        Employee me = getEmployeeByUsername(username);
        LocalDate today = LocalDate.now();

        return cutiRepository
                .findByCoveredByIgnoreCaseAndStatus_StatusNameIn(me.getFullName(), List.of(ACTION_PENDING, ACTION_APPROVED))
                .stream()
                .filter(cuti -> !cuti.getEndDate().isBefore(today))
                .sorted(Comparator.comparing(LeaveRequest::getStartDate))
                .map(cuti -> new LeaveCoverageReminderResponse(
                        cuti.getLeaveRequestId(),
                        cuti.getEmployee() != null ? cuti.getEmployee().getFullName() : "-",
                        cuti.getLeaveType() != null ? cuti.getLeaveType().getName() : "Cuti",
                        cuti.getStartDate(),
                        cuti.getEndDate(),
                        cuti.getStatus().getStatusName()))
                .toList();
    }

    public List<LeaveRequest> getCalendarLeaves(int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);
        // [UBAH] Rentang tanggal + status PENDING/APPROVED disaring di database (findCalendarLeaves);
        // hasil sama dengan filter lama. Filter cuti hangus tetap di sini.
        return cutiRepository.findCalendarLeaves(start, end).stream()
                .filter(cuti -> !isForfeiture(cuti)) // [BARU] catatan hangus tidak tampil di kalender
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

        validateCoveredBy(cuti.getCoveredBy(), requester);

        // [FIX] cuti.getLeaveType() pada titik ini masih objek mentah hasil
        // deserialize JSON body (cuma leaveTypeId terisi, name = null --
        // frontend cuma kirim { leaveTypeId }). Kalau tidak di-fetch ulang
        // di sini, calculateLeaveDays()/validateCutiXxxLimit() di bawah
        // tidak akan pernah mengenali nama jenis cuti (mis. "Cuti setengah
        // hari"), sehingga durasi salah dihitung sebagai 1 hari penuh
        // padahal seharusnya 0,5. Disamakan dengan pola yang sudah dipakai
        // resubmitCuti().
        if (cuti.getLeaveType() == null || cuti.getLeaveType().getLeaveTypeId() == null) {
            throw new RuntimeException("Jenis cuti wajib dipilih");
        }
        cuti.setLeaveType(findSelectableLeaveType(cuti.getLeaveType().getLeaveTypeId())); // [UBAH] tolak jenis sistem "Cuti hangus"

        validateCutiMelahirkanLimit(cuti, requester);
        validateCutiNikahLimit(cuti);
        validateCutiMeninggalLimit(cuti);
        ensureNoOverlap(requester, cuti);

        BigDecimal totalDays = calculateLeaveDays(cuti);
        if (totalDays.signum() <= 0) {
            throw new RuntimeException(getInvalidLeaveDurationMessage(cuti));
        }

        cuti.setTotalDays(totalDays);
        // Nilai ini dihitung server saat benar-benar APPROVED. Client tidak
        // boleh menentukan berapa hari yang dibebankan ke Sisa Cuti Lama.
        cuti.setManualLeaveDays(BigDecimal.ZERO);
        cuti.setStatus(getStatus(ACTION_PENDING));

        LeaveRequest savedCuti = cutiRepository.save(cuti);
        createApprovalSteps(savedCuti, requester);
        notifyApproversOfNewRequest(savedCuti, requester); // [BARU]
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
        validateCoveredBy(cuti.getCoveredBy(), targetEmployee);
        // [FIX] Sama seperti createCuti(): cuti.getLeaveType() di titik ini
        // masih objek mentah dari JSON body (leaveTypeId saja, name = null).
        // Tanpa fetch ulang ini, calculateLeaveDays() & validateCutiXxxLimit()
        // di bawah tidak bisa mengenali "Cuti setengah hari"/"Nikah"/
        // "Meninggal"/"Melahirkan" dari nama -- akibatnya Cuti Setengah Hari
        // yang diinput lewat Cuti Susulan (HR) kepotong 1 hari PENUH ke Sisa
        // Cuti, bukan 0,5 seperti seharusnya. Beda dengan pengajuan mandiri
        // karyawan (createCuti) yang sempat "ke-fix" ulang saat approval
        // 3-tingkat selesai (lihat processApprovalAction), alur Cuti Susulan
        // ini auto-ACC langsung di method ini juga -- tidak pernah lewat
        // recalculation itu, jadi nilai yang salah tersimpan permanen kalau
        // tidak diperbaiki di sini.
        if (cuti.getLeaveType() == null || cuti.getLeaveType().getLeaveTypeId() == null) {
            throw new RuntimeException("Jenis cuti wajib dipilih");
        }
        cuti.setLeaveType(findSelectableLeaveType(cuti.getLeaveType().getLeaveTypeId())); // [UBAH] tolak jenis sistem "Cuti hangus"
        // [BARU] Sebelumnya alur Cuti Susulan/Darurat (HR input) TIDAK
        // divalidasi batas Cuti Meninggal/Melahirkan/Nikah sama sekali -- HR
        // bisa input cuti meninggal 10 hari tanpa ditolak. Sekarang
        // disamakan dengan alur pengajuan mandiri karyawan.
        validateCutiMelahirkanLimit(cuti, targetEmployee);
        validateCutiNikahLimit(cuti);
        validateCutiMeninggalLimit(cuti);
        ensureNoOverlap(targetEmployee, cuti);

        BigDecimal totalDays = calculateLeaveDays(cuti);
        if (totalDays.signum() <= 0) {
            throw new RuntimeException(getInvalidLeaveDurationMessage(cuti));
        }

        cuti.setTotalDays(totalDays);
        // Cuti urgent langsung APPROVED; porsi manual tetap ditentukan server.
        cuti.setManualLeaveDays(BigDecimal.ZERO);
        cuti.setStatus(getStatus(ACTION_APPROVED));
        cuti.setReviewedBy(hrActor);
        // [UBAH] Keterangan disederhanakan jadi "Auto approve oleh <role>"
        // (sebelumnya "Cuti darurat/susulan diinput oleh HR (nama) - auto-ACC").
        // Nama penginput sudah tampil di kolom nama pada riwayat (reviewedBy),
        // jadi tidak perlu diulang di keterangan.
        cuti.setReviewNote("Auto approve oleh " + getAdminRoleLabel(hrActor));
        cuti.setApprovedAt(LocalDateTime.now());

        // Cuti urgent langsung APPROVED, jadi saldo Cuti Lama dipotong
        // sekarang dan porsinya disimpan di leave_requests.
        allocateManualLeaveOnApproval(cuti);

        // [UBAH] Tidak ada lagi baris leave_request_approvals untuk Cuti
        // Susulan: statusnya sudah APPROVED langsung, jadi Leader/SPV/Manager
        // tidak dipilih & tidak dicatat. Siapa yang menginput terekam di
        // reviewedBy + reviewNote (ditampilkan lewat toApprovalResponse()).
        LeaveRequest savedCuti = cutiRepository.save(cuti);
        // [BARU] Cuti susulan langsung APPROVED: absen yang sudah tercatat di tanggal cuti dihapus.
        leaveAttendancePolicy.reconcileOnApproval(savedCuti);
        // [BARU] Cuti susulan langsung disetujui: karyawan yang bersangkutan diberi tahu.
        notificationService.notifyUser(targetEmployee.getUser(), NotificationService.TYPE_LEAVE_APPROVED,
                savedCuti.getLeaveRequestId(), buildLeaveNotificationParams(savedCuti));
        return savedCuti;
    }

    // [BARU] Jenis cuti yang boleh diajukan. "Cuti hangus" (V59) adalah jenis sistem untuk riwayat
    // sisa cuti kedaluwarsa -- tidak boleh diajukan lewat API walau id-nya dikirim manual.
    private LeaveType findSelectableLeaveType(Long leaveTypeId) {
        LeaveType type = leaveTypeRepository.findById(leaveTypeId)
                .orElseThrow(() -> new RuntimeException("Jenis cuti tidak ditemukan"));
        if (Boolean.TRUE.equals(type.getForfeiture())) {
            throw new RuntimeException("Jenis cuti ini tidak dapat diajukan");
        }
        return type;
    }

    private static boolean isForfeiture(LeaveRequest cuti) {
        return cuti.getLeaveType() != null && Boolean.TRUE.equals(cuti.getLeaveType().getForfeiture());
    }

    private void ensureNoOverlap(Employee employee, LeaveRequest cuti) {
        List<LeaveRequest> existingCuti = cutiRepository.findByEmployee_EmployeeIdAndStatus_StatusNameIn(
                employee.getEmployeeId(),
                List.of(ACTION_PENDING, ACTION_APPROVED)
        );

        boolean isOverlap = existingCuti.stream()
                .filter(existing -> !isForfeiture(existing)) // [BARU] catatan hangus bukan hari cuti
                .anyMatch(existing ->
                !cuti.getStartDate().isAfter(existing.getEndDate()) &&
                !cuti.getEndDate().isBefore(existing.getStartDate())
        );

        if (isOverlap) {
            throw new RuntimeException(employee.getFullName() + " sudah memiliki pengajuan cuti pada rentang tanggal yang bentrok");
        }
    }

    @Transactional // [BARU] approval + sinkronisasi absen satu kesatuan
    public LeaveRequest approveCuti(Long leaveRequestId, Long reviewerId) {
        Employee reviewer = karyawanRepository.findById(reviewerId)
                .orElseThrow(() -> new RuntimeException("Reviewer tidak ditemukan"));
        return approveCuti(leaveRequestId, reviewer.getUser().getUsername(), null);
    }

    @Transactional // [BARU] approval + sinkronisasi absen satu kesatuan
    public LeaveRequest approveCuti(Long leaveRequestId, String reviewerUsername, String note) {
        return processApprovalAction(leaveRequestId, reviewerUsername, ACTION_APPROVED, note);
    }

    public LeaveRequest rejectCuti(Long leaveRequestId, Long reviewerId, String note) {
        Employee reviewer = karyawanRepository.findById(reviewerId)
                .orElseThrow(() -> new RuntimeException("Reviewer tidak ditemukan"));
        return rejectCuti(leaveRequestId, reviewer.getUser().getUsername(), note);
    }

    @Transactional // [BARU] penolakan + notifikasi satu kesatuan
    public LeaveRequest rejectCuti(Long leaveRequestId, String reviewerUsername, String note) {
        return processApprovalAction(leaveRequestId, reviewerUsername, ACTION_REJECTED, note);
    }

    @Transactional // [BARU] pengembalian + notifikasi satu kesatuan
    public LeaveRequest returnCuti(Long leaveRequestId, String reviewerUsername, String note) {
        return processApprovalAction(leaveRequestId, reviewerUsername, ACTION_RETURNED, note);
    }

    private boolean isCurrentApprovalStep(LeaveRequestApproval candidate) {
        List<LeaveRequestApproval> steps = approvalRepository
                .findByLeaveRequest_LeaveRequestId(candidate.getLeaveRequest().getLeaveRequestId());
        for (String role : REQUIRED_APPROVER_ROLES) {
            LeaveRequestApproval step = steps.stream()
                    .filter(a -> role.equalsIgnoreCase(a.getApproverRole()))
                    .findFirst().orElse(null);
            if (step == null) continue;
            if (ACTION_APPROVED.equalsIgnoreCase(step.getAction())) continue;
            return step.getApprovalId().equals(candidate.getApprovalId())
                    && ACTION_PENDING.equalsIgnoreCase(step.getAction());
        }
        return false;
    }

    public List<LeaveApprovalResponse> getApprovalTasks(String username) {
        Employee approver = getCurrentApprover(username);
        // Tampilkan semua pengajuan pending yang ditugaskan kepada approver,
        // termasuk tahap yang belum aktif, agar SPV/Manager dapat melihat antrean
        // dan statusnya. Urutan tindakan tetap dipaksakan oleh processApprovalAction.
        List<LeaveRequest> requests = approvalRepository
                .findByApproverEmployee_EmployeeIdAndAction(approver.getEmployeeId(), ACTION_PENDING).stream()
                .map(LeaveRequestApproval::getLeaveRequest)
                .filter(cuti -> ACTION_PENDING.equalsIgnoreCase(cuti.getStatus().getStatusName()))
                .distinct()
                .toList();
        // [UBAH] Performa: seluruh tahap approval dimuat SEKALI (sebelumnya 1 query per pengajuan).
        Map<Long, List<LeaveRequestApproval>> approvalsByRequest = loadApprovalsByRequest(requests);
        return requests.stream()
                .map(cuti -> toApprovalResponse(cuti, approver.getEmployeeId(),
                        approvalsByRequest.getOrDefault(cuti.getLeaveRequestId(), List.of())))
                .toList();
    }

    // [BARU] Satu query untuk semua tahap approval dari sekumpulan pengajuan, dikelompokkan per pengajuan.
    private Map<Long, List<LeaveRequestApproval>> loadApprovalsByRequest(List<LeaveRequest> requests) {
        if (requests.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = requests.stream().map(LeaveRequest::getLeaveRequestId).toList();
        return approvalRepository.findAllByLeaveRequestIds(ids).stream()
                .collect(Collectors.groupingBy(approval -> approval.getLeaveRequest().getLeaveRequestId()));
    }

    public List<LeaveApprovalResponse> getApprovalHistory(String username, String status) {
        Employee approver = getCurrentApprover(username);
        List<LeaveRequest> requests = approvalRepository.findByApproverEmployee_EmployeeId(approver.getEmployeeId()).stream()
                .map(LeaveRequestApproval::getLeaveRequest)
                .distinct()
                .filter(cuti -> status == null || status.isBlank()
                        || cuti.getStatus().getStatusName().equalsIgnoreCase(status))
                .toList();
        // [UBAH] Performa: tahap approval dimuat sekali (lihat getApprovalTasks).
        Map<Long, List<LeaveRequestApproval>> approvalsByRequest = loadApprovalsByRequest(requests);
        return requests.stream()
                .map(cuti -> toApprovalResponse(cuti, approver.getEmployeeId(),
                        approvalsByRequest.getOrDefault(cuti.getLeaveRequestId(), List.of())))
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

    // [BARU] Dipakai alat dev (/devAccess) yang sudah memegang entity Employee,
    // supaya tidak perlu query ulang. Tetap lewat getLeaveBalance(Employee) yang sama.
    public LeaveBalanceResponse getLeaveBalanceOf(Employee employee) {
        return getLeaveBalance(employee);
    }

    // [BARU] Performa: versi massal -- riwayat cuti APPROVED & jenis "Cuti tahunan" sudah dimuat
    // SEKALI oleh pemanggil, jadi tidak ada query per karyawan. Rumus tetap sama (buildLeaveBalance).
    public LeaveBalanceResponse getLeaveBalanceOf(Employee employee, List<LeaveRequest> approvedLeaves,
                                                  LeaveType annualLeave) {
        return buildLeaveBalance(employee, approvedLeaves, annualLeave);
    }

    // [BARU] Jenis "Cuti tahunan" (null bila belum ada) -- dibaca sekali untuk perhitungan massal.
    public LeaveType getAnnualLeaveType() {
        return leaveTypeRepository.findByNameIgnoreCase("Cuti tahunan").orElse(null);
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
    // [UBAH] Performa: dulu memanggil getLeaveBalance() per karyawan, dan tiap panggilan
    // menjalankan query riwayat cuti + query jenis cuti sendiri (N+1). Sekarang semua
    // data dimuat SEKALI (karyawan, cuti APPROVED, jenis "Cuti tahunan"), dikelompokkan
    // per karyawan di memori, lalu dihitung dengan rumus yang SAMA (buildLeaveBalance).
    @Transactional(readOnly = true)
    public List<LeaveBalanceResponse> getAllLeaveBalances() {
        List<Employee> employees = reportScopeService.withoutDevEmployees( // tanpa akun dev
                karyawanRepository.findAllWithRelations());
        LeaveType annualLeave = leaveTypeRepository.findByNameIgnoreCase("Cuti tahunan").orElse(null);
        Map<Long, List<LeaveRequest>> approvedByEmployee = cutiRepository.findAllApprovedWithDetails().stream()
                .collect(Collectors.groupingBy(cuti -> cuti.getEmployee().getEmployeeId()));
        return employees.stream()
                .map(employee -> buildLeaveBalance(
                        employee,
                        approvedByEmployee.getOrDefault(employee.getEmployeeId(), List.of()),
                        annualLeave))
                .toList();
    }

    /**
     * Menghitung saldo cuti karyawan.
     *
     * Aturan:
     * 1. Cuti Tahunan mengikuti periode anniversary tanggal masuk.
     * 2. Saldo Cuti Tahunan boleh negatif. Defisit suatu periode hanya
     *    mengurangi kuota pada periode anniversary berikutnya.
     * 3. Sisa Cuti (lama/manual) adalah saldo yang saat ini tersimpan pada
     *    employees.manual_leave_balance. Saldo manual TIDAK boleh mengubah
     *    histori Cuti Tahunan yang terjadi sebelum alokasi manual diberikan.
     * 4. Porsi manual yang dipakai setiap pengajuan disimpan di
     *    leave_requests.manual_leave_days. Dengan begitu riwayat yang sudah
     *    terjadi tidak perlu ditebak ulang dari saldo manual saat ini.
     */
    private LeaveBalanceResponse getLeaveBalance(Employee employee) {
        // [UBAH] Pemuatan data dipisah dari perhitungan supaya getAllLeaveBalances()
        // bisa memakai ulang rumus yang sama tanpa query per karyawan.
        return buildLeaveBalance(
                employee,
                getCutiByKaryawan(employee.getEmployeeId()),
                leaveTypeRepository.findByNameIgnoreCase("Cuti tahunan").orElse(null));
    }

    private LeaveBalanceResponse buildLeaveBalance(
            Employee employee, List<LeaveRequest> employeeLeaves, LeaveType annualLeave) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Jakarta"));
        LocalDate joinDate = employee.getJoinDate();

        BigDecimal manualRemaining = employee.getManualLeaveBalance() == null
                ? BigDecimal.ZERO
                : employee.getManualLeaveBalance();

        boolean belumBerhakCutiTahunan =
                joinDate == null || joinDate.plusYears(1).isAfter(today);

        // Hanya histori APPROVED yang memang memotong kuota tahunan yang
        // dipakai untuk menghitung pemakaian tahunan dan defisit.
        List<LeaveRequest> relevantApprovedLeaves = employeeLeaves.stream()
                .filter(cuti -> ACTION_APPROVED.equalsIgnoreCase(cuti.getStatus().getStatusName()))
                .filter(cuti -> Boolean.TRUE.equals(cuti.getLeaveType().getDeductsAnnualQuota()))
                // [BARU] Riwayat hasil import ledger tidak ikut menghitung saldo (lihat V56).
                .filter(cuti -> !Boolean.TRUE.equals(cuti.getImportedHistory()))
                .sorted(Comparator.comparing(LeaveRequest::getStartDate)
                        .thenComparing(
                                LeaveRequest::getSubmittedAt,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        // Porsi yang benar-benar dibebankan ke Cuti Tahunan:
        // totalDays - manualLeaveDays.
        Map<Long, BigDecimal> annualPortionByRequestId = relevantApprovedLeaves.stream()
                .collect(Collectors.toMap(
                        LeaveRequest::getLeaveRequestId,
                        cuti -> {
                            BigDecimal totalDays = cuti.getTotalDays() == null
                                    ? BigDecimal.ZERO
                                    : cuti.getTotalDays();
                            BigDecimal manualDays = cuti.getManualLeaveDays() == null
                                    ? BigDecimal.ZERO
                                    : cuti.getManualLeaveDays();
                            return totalDays.subtract(manualDays).max(BigDecimal.ZERO);
                        },
                        (existing, replacement) -> existing
                ));

        if (belumBerhakCutiTahunan) {
            return LeaveBalanceResponse.builder()
                    .employeeId(employee.getEmployeeId())
                    .employeeName(employee.getFullName())
                    .annualQuota(BigDecimal.ZERO)
                    .usedAnnualLeave(BigDecimal.ZERO)
                    .remainingAnnualLeave(BigDecimal.ZERO)
                    .annualPeriodEnd(null)
                    .annualPeriodStart(null) // [BARU]
                    .annualUsedOutsideSystem(BigDecimal.ZERO) // [BARU]
                    .annualEligibleFrom(joinDate == null ? null : joinDate.plusYears(1))
                    .manualLeaveAllocated(manualRemaining)
                    .remainingManualLeave(manualRemaining)
                    .totalRemainingLeave(manualRemaining)
                    .build();
        }

        BigDecimal baseAnnualQuota = BigDecimal.valueOf(getAnnualQuota(employee, annualLeave));

        long tahunKerjaPenuh = ChronoUnit.YEARS.between(joinDate, today);
        LocalDate periodeMulai = joinDate.plusYears(tahunKerjaPenuh);
        LocalDate periodeSelesai = periodeMulai.plusYears(1);

        BigDecimal annualQuota = calculateCarryAdjustedAnnualQuota(
                baseAnnualQuota,
                joinDate,
                periodeMulai,
                relevantApprovedLeaves,
                annualPortionByRequestId,
                employee // [BARU] supaya penyesuaian manual ikut dihitung di carry-over
        );

        // [BARU] Cuti tahunan yang sudah terpakai di luar sistem (data manual) untuk periode ini
        BigDecimal usedOutsideSystem = getAnnualUsedOutsideSystem(employee, periodeMulai);

        // [UBAH] + usedOutsideSystem di akhir
        BigDecimal usedAnnualLeave = relevantApprovedLeaves.stream()
                .filter(cuti -> !cuti.getStartDate().isBefore(periodeMulai)
                        && cuti.getStartDate().isBefore(periodeSelesai))
                .map(cuti -> annualPortionByRequestId.getOrDefault(
                        cuti.getLeaveRequestId(), BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(usedOutsideSystem);

        // JANGAN di-clamp ke 0. Nilai negatif adalah defisit periode berjalan
        // dan akan mengurangi kuota pada anniversary berikutnya.
        BigDecimal remainingAnnualLeave = annualQuota.subtract(usedAnnualLeave);

        return LeaveBalanceResponse.builder()
                .employeeId(employee.getEmployeeId())
                .employeeName(employee.getFullName())
                .annualQuota(annualQuota)
                .usedAnnualLeave(usedAnnualLeave)
                .remainingAnnualLeave(remainingAnnualLeave)
                .annualPeriodEnd(periodeSelesai)
                .annualPeriodStart(periodeMulai) // [BARU]
                .annualUsedOutsideSystem(usedOutsideSystem) // [BARU]
                .annualEligibleFrom(null)
                .manualLeaveAllocated(manualRemaining)
                .remainingManualLeave(manualRemaining)
                .totalRemainingLeave(remainingAnnualLeave.add(manualRemaining))
                .build();
    }

    /**
     * Menghitung kuota pembuka periode berjalan dengan carry-over DEFISIT.
     *
     * Periode pertama dimulai saat karyawan genap 1 tahun. Hanya saldo negatif
     * yang dibawa ke anniversary berikutnya. Saldo positif tidak dibawa.
     *
     * Contoh:
     *   kuota 12, pemakaian periode sebelumnya 16 -> defisit -4
     *   kuota periode berikutnya = 12 - 4 = 8
     */
    private BigDecimal calculateCarryAdjustedAnnualQuota(
            BigDecimal baseQuota,
            LocalDate joinDate,
            LocalDate currentPeriodStart,
            List<LeaveRequest> approvedLeaves,
            Map<Long, BigDecimal> annualPortionByRequestId,
            Employee employee) { // [BARU] parameter employee

        BigDecimal previousDeficit = BigDecimal.ZERO;
        LocalDate periodStart = joinDate.plusYears(1);

        while (periodStart.isBefore(currentPeriodStart)) {
            LocalDate periodEnd = periodStart.plusYears(1);
            final LocalDate periodStartFinal = periodStart;

            BigDecimal openingQuota = baseQuota.add(previousDeficit);

            BigDecimal usedInPeriod = approvedLeaves.stream()
                    .filter(cuti -> !cuti.getStartDate().isBefore(periodStartFinal)
                            && cuti.getStartDate().isBefore(periodEnd))
                    .map(cuti -> annualPortionByRequestId.getOrDefault(
                            cuti.getLeaveRequestId(), BigDecimal.ZERO))
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .add(getAnnualUsedOutsideSystem(employee, periodStartFinal)); // [BARU]

            BigDecimal endingBalance = openingQuota.subtract(usedInPeriod);
            previousDeficit = endingBalance.min(BigDecimal.ZERO);
            periodStart = periodEnd;
        }

        return baseQuota.add(previousDeficit);
    }

    /**
     * [BARU] Cuti tahunan yang sudah terpakai di luar sistem (data manual, diisi dari
     * /devAccess). Hanya berlaku bila periode yang dihitung PERSIS periode yang dicatat
     * saat pengisian; periode lain (atau tanggal masuk yang berubah) mengembalikan 0.
     */
    private BigDecimal getAnnualUsedOutsideSystem(Employee employee, LocalDate periodStart) {
        BigDecimal value = employee.getAnnualUsedOutsideSystem();
        if (value == null || value.signum() == 0) {
            return BigDecimal.ZERO;
        }
        return periodStart.equals(employee.getAnnualUsedOutsidePeriodStart())
                ? value
                : BigDecimal.ZERO;
    }

    /**
     * Saat sebuah pengajuan benar-benar menjadi APPROVED, potong Sisa Cuti
     * (manual) terlebih dahulu. Porsi manual yang terpakai disimpan pada
     * leave_requests agar histori tetap konsisten walaupun saldo manual
     * kemudian diedit HR.
     */
    private void allocateManualLeaveOnApproval(LeaveRequest cuti) {
        // Lindungi dari pemotongan ganda jika method terpanggil lebih dari sekali
        // pada entity approval yang sama.
        if (cuti.getManualLeaveDays() != null && cuti.getManualLeaveDays().signum() > 0) {
            return;
        }

        if (cuti.getLeaveType() == null
                || !Boolean.TRUE.equals(cuti.getLeaveType().getDeductsAnnualQuota())) {
            cuti.setManualLeaveDays(BigDecimal.ZERO);
            return;
        }

        BigDecimal totalDays = cuti.getTotalDays() == null
                ? BigDecimal.ZERO
                : cuti.getTotalDays();

        Employee employee = karyawanRepository.findById(cuti.getEmployee().getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Karyawan pemohon tidak ditemukan"));

        BigDecimal manualBalance = employee.getManualLeaveBalance() == null
                ? BigDecimal.ZERO
                : employee.getManualLeaveBalance();

        BigDecimal manualUsed = manualBalance
                .min(totalDays)
                .max(BigDecimal.ZERO);

        employee.setManualLeaveBalance(manualBalance.subtract(manualUsed));
        karyawanRepository.save(employee);
        cuti.setManualLeaveDays(manualUsed);
    }

    @Transactional
    public void deleteCuti(Long id) {
        LeaveRequest cuti = getCutiById(id);

        // Jika cuti yang sudah APPROVED dihapus, kembalikan porsi manual
        // yang sebelumnya dipakai oleh pengajuan tersebut.
        if (ACTION_APPROVED.equalsIgnoreCase(cuti.getStatus().getStatusName())) {
            BigDecimal manualUsed = cuti.getManualLeaveDays() == null
                    ? BigDecimal.ZERO
                    : cuti.getManualLeaveDays();

            if (manualUsed.signum() > 0) {
                Employee employee = karyawanRepository.findById(cuti.getEmployee().getEmployeeId())
                        .orElseThrow(() -> new RuntimeException("Karyawan pemohon tidak ditemukan"));
                BigDecimal currentBalance = employee.getManualLeaveBalance() == null
                        ? BigDecimal.ZERO
                        : employee.getManualLeaveBalance();
                employee.setManualLeaveBalance(currentBalance.add(manualUsed));
                karyawanRepository.save(employee);
            }
        }

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

        existingCuti.setLeaveType(findSelectableLeaveType(updatedCuti.getLeaveType().getLeaveTypeId())); // [UBAH] tolak jenis sistem "Cuti hangus"
        existingCuti.setStartDate(updatedCuti.getStartDate());
        existingCuti.setEndDate(updatedCuti.getEndDate());
        validateCutiMelahirkanLimit(existingCuti, requester);
        validateCutiNikahLimit(existingCuti);
        validateCutiMeninggalLimit(existingCuti);
        BigDecimal totalDays = calculateLeaveDays(existingCuti);
        if (totalDays.signum() <= 0) {
            throw new RuntimeException(getInvalidLeaveDurationMessage(existingCuti));
        }
        existingCuti.setTotalDays(totalDays);
        // [BARU] Sebelumnya TIDAK ada baris ini -- session lama tidak pernah
        // ter-update saat resubmit, karena method ini copy field satu per
        // satu (bukan save entity utuh seperti createCuti()).
        existingCuti.setSession(updatedCuti.getSession());
        existingCuti.setReason(updatedCuti.getReason());
        existingCuti.setPendingWork(updatedCuti.getPendingWork());
        validateCoveredBy(updatedCuti.getCoveredBy(), requester);
        existingCuti.setCoveredBy(updatedCuti.getCoveredBy());
        existingCuti.setLeaderEmployeeId(updatedCuti.getLeaderEmployeeId());
        existingCuti.setSpvEmployeeId(updatedCuti.getSpvEmployeeId());
        existingCuti.setManagerEmployeeId(updatedCuti.getManagerEmployeeId());
        existingCuti.setHrdEmployeeId(updatedCuti.getHrdEmployeeId()); // [BARU]
        existingCuti.setStatus(getStatus(ACTION_PENDING));
        existingCuti.setReviewedBy(null);
        existingCuti.setReviewNote(null);
        existingCuti.setApprovedAt(null);
        existingCuti.setReturnedAt(null);
        existingCuti.setManualLeaveDays(BigDecimal.ZERO);
        existingCuti.setSubmittedAt(LocalDateTime.now());

        approvalRepository.deleteAll(approvalRepository.findByLeaveRequest_LeaveRequestId(leaveRequestId));
        approvalRepository.flush();
        LeaveRequest savedCuti = cutiRepository.save(existingCuti);
        createApprovalSteps(savedCuti, requester);
        notifyApproversOfNewRequest(savedCuti, requester); // [BARU]
        return savedCuti;
    }

    private LeaveRequest processApprovalAction(Long leaveRequestId, String reviewerUsername, String action, String note) {
        if (note == null || note.isBlank()) {
            throw new RuntimeException("Catatan approval wajib diisi");
        }

        LeaveRequest cuti = getCutiById(leaveRequestId);
        Employee reviewer = getEmployeeByUsername(reviewerUsername);
        // [UBAH] HRD_ADMIN & HRD_KARYAWAN sama-sama dipetakan ke tahap "HRD".
        String approverRole = resolveApprovalStageRole(reviewer);

        if (!APPROVAL_STAGE_ROLES.contains(approverRole)) {
            throw new RuntimeException("Role ini tidak memiliki akses approval cuti");
        }

        // [BARU] Pemohon tidak boleh memproses cutinya sendiri (lapisan kedua setelah pilihan dropdown).
        hrdApproverPolicy.assertNotOwnRequest(reviewer, cuti.getEmployee());

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

        // Approval harus berurutan: Leader -> SPV -> Manager (hanya relevan untuk pengajuan lama;
        // pengajuan baru hanya punya satu tahap HRD sehingga loop ini langsung dilewati).
        List<LeaveRequestApproval> approvalSteps = approvalRepository
                .findByLeaveRequest_LeaveRequestId(leaveRequestId);
        for (String requiredRole : REQUIRED_APPROVER_ROLES) {
            LeaveRequestApproval step = approvalSteps.stream()
                    .filter(a -> requiredRole.equalsIgnoreCase(a.getApproverRole()))
                    .findFirst().orElse(null);
            if (step == null) continue; // misalnya cuti milik Leader/SPV/Manager hanya perlu Manager
            if (step.getApprovalId().equals(approval.getApprovalId())) break;
            if (!ACTION_APPROVED.equalsIgnoreCase(step.getAction())) {
                throw new RuntimeException("Persetujuan harus berurutan. Menunggu persetujuan "
                        + requiredRole + " terlebih dahulu");
            }
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
            notifyRequester(cuti, NotificationService.TYPE_LEAVE_REJECTED, null); // [BARU]
        } else if (ACTION_RETURNED.equals(action)) {
            cuti.setStatus(getStatus(ACTION_RETURNED));
            cuti.setReturnedAt(LocalDateTime.now());
            notifyRequester(cuti, NotificationService.TYPE_LEAVE_RETURNED, null); // [BARU]
        } else if (isAllApprovalsApproved(leaveRequestId)) {
            // [FIX] Hitung ulang totalDays di sini, JANGAN percaya begitu saja
            // nilai yang tersimpan sejak pengajuan dibuat. Kalau pengajuan
            // sempat dibuat oleh versi aplikasi lama (mis. sebelum dukungan
            // Cuti Setengah Hari 0,5 hari dibetulkan) lalu baru di-ACC
            // sekarang, tanpa baris ini saldo akan tetap terpotong dengan
            // angka lama yang salah walau kode sudah dibetulkan.
            BigDecimal recalculatedTotalDays = calculateLeaveDays(cuti);
            if (recalculatedTotalDays.signum() > 0) {
                cuti.setTotalDays(recalculatedTotalDays);
            }

            // Semua tahap sudah ACC: baru pada titik ini saldo Cuti Lama
            // benar-benar dipotong. Pengajuan PENDING/RETURNED/REJECTED
            // tidak menyentuh saldo.
            allocateManualLeaveOnApproval(cuti);
            cuti.setStatus(getStatus(ACTION_APPROVED));
            cuti.setApprovedAt(LocalDateTime.now());

            // [BARU] Approval terakhir: absen yang terlanjur tercatat (saat cuti masih PENDING)
            // dihapus & hari itu tampil sebagai CUTI. Satu transaksi dengan approval.
            LeaveRequest approvedCuti = cutiRepository.save(cuti);
            leaveAttendancePolicy.reconcileOnApproval(approvedCuti);
            notifyRequester(approvedCuti, NotificationService.TYPE_LEAVE_APPROVED, null); // [BARU]
            return approvedCuti;
        }

        // [BARU] Tahap ini disetujui tapi berkas belum final: kabari pemohon per tahap.
        notifyRequester(cuti, NotificationService.TYPE_LEAVE_STEP_APPROVED, Map.of(
                "actorRole", approverRole,
                "actorName", reviewer.getFullName() == null ? "-" : reviewer.getFullName()));
        return cutiRepository.save(cuti);
    }

    // ===================== [BARU] NOTIFIKASI DATABASE =====================

    private Map<String, Object> buildLeaveNotificationParams(LeaveRequest cuti) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("leaveRequestId", cuti.getLeaveRequestId());
        params.put("leaveType", cuti.getLeaveType() != null && cuti.getLeaveType().getName() != null
                ? cuti.getLeaveType().getName() : "");
        params.put("startDate", cuti.getStartDate() == null ? null : cuti.getStartDate().toString());
        params.put("endDate", cuti.getEndDate() == null ? null : cuti.getEndDate().toString());
        return params;
    }

    // Kabari pemohon (status final / progres per tahap).
    private void notifyRequester(LeaveRequest cuti, String type, Map<String, Object> extra) {
        Employee requester = cuti.getEmployee();
        if (requester == null) {
            return;
        }
        Map<String, Object> params = buildLeaveNotificationParams(cuti);
        if (extra != null) {
            params.putAll(extra);
        }
        notificationService.notifyUser(requester.getUser(), type, cuti.getLeaveRequestId(), params);
    }

    // Kabari semua approver yang ditugaskan (Leader/SPV/Manager) bahwa ada pengajuan baru.
    private void notifyApproversOfNewRequest(LeaveRequest cuti, Employee requester) {
        Map<String, Object> params = buildLeaveNotificationParams(cuti);
        params.put("requesterName", requester.getFullName() == null ? "" : requester.getFullName());
        approvalRepository.findByLeaveRequest_LeaveRequestId(cuti.getLeaveRequestId()).stream()
                .map(LeaveRequestApproval::getApproverEmployee)
                .filter(Objects::nonNull)
                .map(Employee::getUser)
                .filter(Objects::nonNull)
                .distinct()
                .forEach(user -> notificationService.notifyUser(user, NotificationService.TYPE_LEAVE_APPROVAL,
                        cuti.getLeaveRequestId(), params));
    }

    // [UBAH] Semua pengajuan baru -- siapa pun jabatan pemohonnya -- punya SATU tahap approval: HRD.
    // Server hanya memakai hrdEmployeeId; leader/spv/manager dari klien diabaikan.
    private void createApprovalSteps(LeaveRequest cuti, Employee requester) {
        Employee hrd = hrdApproverPolicy.requireSelectableApprover(cuti.getHrdEmployeeId(), requester);
        approvalRepository.save(buildApproval(cuti, ROLE_HRD, hrd));
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
        return toApprovalResponse(cuti, currentEmployeeId,
                approvalRepository.findByLeaveRequest_LeaveRequestId(cuti.getLeaveRequestId()));
    }

    // [UBAH] Isi method lama dipindah ke sini; approvals diberikan pemanggil (bisa hasil pemuatan massal).
    private LeaveApprovalResponse toApprovalResponse(LeaveRequest cuti, Long currentEmployeeId,
                                                     List<LeaveRequestApproval> approvals) {
        String myApprovalStatus = approvals.stream()
                .filter(approval -> approval.getApproverEmployee() != null
                        && approval.getApproverEmployee().getEmployeeId().equals(currentEmployeeId))
                .map(LeaveRequestApproval::getAction)
                .findFirst()
                .orElse(null);

        List<LeaveApprovalLogResponse> logs = new ArrayList<>(approvals.stream()
                .map(approval -> new LeaveApprovalLogResponse(
                        approval.getApproverRole(),
                        approval.getAction(),
                        approval.getApproverEmployee() == null ? null : approval.getApproverEmployee().getFullName(),
                        approval.getNote(),
                        approval.getActedAt()
                ))
                .toList());

        // [BARU] Cuti Susulan (diinput HR, auto-ACC) tidak punya baris approval,
        // jadi riwayat/timeline detailnya kosong. Tambahkan satu entri log
        // dari data yang tersimpan di leave_requests (reviewedBy, reviewNote,
        // approvedAt) supaya karyawan tetap melihat "Disetujui oleh HR ...".
        if (approvals.isEmpty()
                && cuti.getReviewedBy() != null
                && ACTION_APPROVED.equalsIgnoreCase(cuti.getStatus().getStatusName())) {
            logs.add(new LeaveApprovalLogResponse(
                    "HR",
                    ACTION_APPROVED,
                    cuti.getReviewedBy().getFullName(),
                    cuti.getReviewNote(),
                    cuti.getApprovedAt()
            ));
        }

        // Mengambil data Leader, SPV, dan Manager dari tabel approvals
        Employee leader = approvals.stream().filter(a->ROLE_LEADER.equals(a.getApproverRole())).map(LeaveRequestApproval::getApproverEmployee).findFirst().orElse(null);
        Employee spv = approvals.stream().filter(a->ROLE_SPV.equals(a.getApproverRole())).map(LeaveRequestApproval::getApproverEmployee).findFirst().orElse(null);
        Employee manager = approvals.stream().filter(a->ROLE_MANAGER.equals(a.getApproverRole())).map(LeaveRequestApproval::getApproverEmployee).findFirst().orElse(null);
        Employee hrd = approvals.stream().filter(a->ROLE_HRD.equals(a.getApproverRole())).map(LeaveRequestApproval::getApproverEmployee).findFirst().orElse(null); // [BARU]

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
                hrd==null?null:hrd.getEmployeeId(), // [BARU]
                hrd==null?null:hrd.getFullName(),   // [BARU]
                cuti.getSubmittedAt(),
                cuti.getStatus().getStatusName(),
                myApprovalStatus,
                cuti.getReviewNote(),
                logs
        );
    }

    private Employee getCurrentApprover(String username) {
        Employee employee = getEmployeeByUsername(username);
        String role = resolveApprovalStageRole(employee);

        if (!APPROVAL_STAGE_ROLES.contains(role)) {
            throw new RuntimeException("Role ini tidak memiliki akses approval cuti");
        }

        return employee;
    }

    // [BARU] Akun khusus dev (panel /devAccess) (lihat frontend ProtectedRoute.jsx &
    // migration V34/V35) SENGAJA dibuat TANPA profil Employee -- supaya
    // tidak pernah muncul di halaman Karyawan. Auto-create di bawah ini
    // (createEmployeeProfileForExistingUser) awalnya jadi bug: begitu akun
    // ini menyentuh endpoint cuti/approval apa pun (mis. badge approval di
    // Sidebar), Employee-nya otomatis ter-create lagi. Jadi username ini
    // WAJIB dikecualikan dari auto-create -- fitur cuti/approval memang
    // TIDAK dimaksudkan untuk akun ini, jadi melempar error di sini adalah
    // perilaku yang benar, bukan bug.
    private final DevAccessService devAccessService;

    private Employee getEmployeeByUsername(String username) {
        return karyawanRepository.findFirstByUser_Username(username)
                .orElseGet(() -> createEmployeeProfileForExistingUser(username));
    }

    private Employee createEmployeeProfileForExistingUser(String username) {
        if (devAccessService.isDevAccount(username)) {
            throw new RuntimeException("Akun ini tidak memiliki profil karyawan dan tidak dibuatkan otomatis");
        }

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

    // [BARU] Kuota dasar cuti tahunan satu periode (tanpa carry-over defisit) -- dipakai
    // LeaveSummaryService supaya angkanya sama dengan getLeaveBalance().
    public BigDecimal getBaseAnnualQuotaOf(Employee employee) {
        LeaveType annualLeave = leaveTypeRepository.findByNameIgnoreCase("Cuti tahunan").orElse(null);
        return BigDecimal.valueOf(getAnnualQuota(employee, annualLeave));
    }

    // [BARU] Versi massal: jenis cuti tahunan diberikan pemanggil (tanpa query).
    public BigDecimal getBaseAnnualQuotaOf(Employee employee, LeaveType annualLeave) {
        return BigDecimal.valueOf(getAnnualQuota(employee, annualLeave));
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

    // [UBAH] Sebelumnya satu method gabungan validateSpecialLeaveLimits().
    // Sekarang dipecah jadi 3 method independen -- validateCutiMelahirkanLimit
    // (di bawah), validateCutiNikahLimit, & validateCutiMeninggalLimit --
    // supaya tiap jenis cuti khusus berdiri sendiri, lebih mudah dibaca &
    // tidak saling menimpa kalau salah satunya diubah lagi nanti. Ketiganya
    // dipanggil bersamaan dari createCuti/createUrgentCuti/resubmitCuti.
    //
    // Laki-laki (dianggap cuti pendamping melahirkan) dibatasi maksimal
    // MATERNITY_MAX_DAYS_MALE HARI KERJA (Sabtu/Minggu & tanggal merah tidak
    // dihitung), sedangkan Perempuan dibatasi maksimal
    // MATERNITY_MAX_MONTHS_FEMALE bulan KALENDER dari tanggal mulai.
    // Dicek berdasarkan nama jenis cuti (mengandung kata "melahirkan"),
    // supaya tetap berlaku walau nama tepatnya "Cuti Melahirkan (Khusus)".
    private void validateCutiMelahirkanLimit(LeaveRequest cuti, Employee requester) {
        String leaveTypeName = cuti.getLeaveType() == null ? "" : cuti.getLeaveType().getName();
        if (leaveTypeName == null || !leaveTypeName.toLowerCase(Locale.ROOT).contains("melahirkan")) {
            return;
        }
        if (cuti.getStartDate() == null || cuti.getEndDate() == null) {
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

    // [BARU] Validasi batas Cuti Nikah: maksimal MARRIAGE_MAX_DAYS HARI
    // KERJA (Sabtu/Minggu & tanggal merah tidak dihitung), sama untuk semua
    // gender. Dicek berdasarkan nama jenis cuti mengandung kata "nikah"
    // (mis. "Cuti Nikah", "Cuti Menikah").
    private void validateCutiNikahLimit(LeaveRequest cuti) {
        String leaveTypeName = cuti.getLeaveType() == null ? "" : cuti.getLeaveType().getName();
        if (leaveTypeName == null || !leaveTypeName.toLowerCase(Locale.ROOT).contains("nikah")) {
            return;
        }
        if (cuti.getStartDate() == null || cuti.getEndDate() == null) {
            return;
        }

        int totalHariKerja = calculateWorkingDays(cuti.getStartDate(), cuti.getEndDate());
        if (totalHariKerja > MARRIAGE_MAX_DAYS) {
            throw new RuntimeException("Cuti nikah maksimal " + MARRIAGE_MAX_DAYS + " hari kerja");
        }
    }

    // [DIEKSTRAK dari validateSpecialLeaveLimits lama -- perilaku tidak
    // berubah] Validasi batas Cuti Meninggal: maksimal BEREAVEMENT_MAX_DAYS
    // HARI KERJA (Sabtu/Minggu & tanggal merah tidak dihitung). Dicek
    // berdasarkan nama jenis cuti mengandung kata "meninggal".
    private void validateCutiMeninggalLimit(LeaveRequest cuti) {
        String leaveTypeName = cuti.getLeaveType() == null ? "" : cuti.getLeaveType().getName();
        if (leaveTypeName == null || !leaveTypeName.toLowerCase(Locale.ROOT).contains("meninggal")) {
            return;
        }
        if (cuti.getStartDate() == null || cuti.getEndDate() == null) {
            return;
        }

        int totalHariKerja = calculateWorkingDays(cuti.getStartDate(), cuti.getEndDate());
        if (totalHariKerja > BEREAVEMENT_MAX_DAYS) {
            throw new RuntimeException("Cuti meninggal maksimal " + BEREAVEMENT_MAX_DAYS + " hari kerja");
        }
    }

    private String getInvalidLeaveDurationMessage(LeaveRequest cuti) {
        String leaveTypeName = cuti.getLeaveType() == null ? "" : cuti.getLeaveType().getName();
        String normalizedLeaveTypeName = leaveTypeName == null
                ? ""
                : leaveTypeName.trim().toLowerCase(Locale.ROOT);

        if ("cuti setengah hari".equals(normalizedLeaveTypeName) || isUrgentHalfDay(cuti)) {
            return "Rentang cuti harus memiliki minimal setengah hari kerja";
        }

        return "Rentang cuti harus memiliki minimal satu hari kerja";
    }

    // [BARU] true kalau pengajuan ini "Cuti Urgent" DAN sesi (PAGI/SIANG)
    // terisi -- artinya user memilih "Cuti Setengah Hari" di dropdown
    // "DURASI CUTI URGENT" pada frontend. Jenis cuti lain (selain "Cuti
    // Setengah Hari" yang sudah dicek terpisah) tidak pernah mengirim
    // session, jadi tidak terpengaruh oleh perubahan ini.
    private boolean isUrgentHalfDay(LeaveRequest cuti) {
        String leaveTypeName = cuti.getLeaveType() == null ? "" : cuti.getLeaveType().getName();
        String normalized = leaveTypeName == null ? "" : leaveTypeName.trim().toLowerCase(Locale.ROOT);
        return "cuti urgent".equals(normalized) && cuti.getSession() != null && !cuti.getSession().isBlank();
    }

    private BigDecimal calculateLeaveDays(LeaveRequest cuti) {
        String leaveTypeName = cuti.getLeaveType() == null ? "" : cuti.getLeaveType().getName();
        // [FIX] Disamakan dengan getInvalidLeaveDurationMessage() yang sudah
        // trim() lebih dulu -- sebelumnya method ini TIDAK trim, jadi nama
        // jenis cuti dengan spasi tak sengaja (leading/trailing) akan lolos
        // dari pengecekan "cuti setengah hari" dan dihitung sebagai 1 hari
        // penuh, bukan 0,5.
        String normalizedLeaveTypeName = leaveTypeName == null ? "" : leaveTypeName.trim().toLowerCase(Locale.ROOT);

        // [BARU] "Cuti Urgent" sekarang juga bisa setengah hari -- frontend
        // (LeaveTypeDateSection.jsx, dropdown "DURASI CUTI URGENT") mengirim
        // kode sesi ("PAGI"/"SIANG") persis seperti "Cuti Setengah Hari"
        // ketika opsi ini dipilih. isUrgentHalfDay() mendeteksinya dari
        // kombinasi nama jenis cuti "cuti urgent" + session terisi, supaya
        // jenis cuti lain (session selalu null) tidak ikut terpengaruh.
        if ("cuti setengah hari".equals(normalizedLeaveTypeName) || isUrgentHalfDay(cuti)) {
            if (!cuti.getStartDate().equals(cuti.getEndDate())) {
                throw new RuntimeException("Cuti setengah hari hanya dapat diajukan untuk satu tanggal");
            }
            // Setengah hari hanya memiliki nilai 0,5 jika tanggalnya memang
            // hari kerja. Sabtu/Minggu dan tanggal merah menghasilkan 0 hari
            // kerja, sehingga validasi akan menolak pengajuan dengan pesan
            // minimal setengah hari kerja.
            return calculateWorkingDays(cuti.getStartDate(), cuti.getEndDate()) > 0
                    ? new BigDecimal("0.5")
                    : BigDecimal.ZERO;
        }

        // [UBAH] Cuti Melahirkan PEREMPUAN tetap dihitung hari KALENDER
        // (konsisten dengan batas 3 bulan yang tidak boleh terpotong akhir
        // pekan/hari libur). Cuti Melahirkan LAKI-LAKI (pendamping) sekarang
        // ikut hari KERJA seperti jenis cuti lain -- sebelumnya sama-sama
        // hari kalender, padahal batasnya (MATERNITY_MAX_DAYS_MALE) sudah
        // diubah jadi hari kerja di validateCutiMelahirkanLimit().
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

    // [BARU] Label role penginput Cuti Susulan untuk keterangan auto approve.
    // Endpoint /api/cuti/urgent terbuka untuk ADMIN, HRD_ADMIN, dan
    // SUPER_ADMIN, jadi labelnya mengikuti role asli penginput.
    private String getAdminRoleLabel(Employee actor) {
        String role = normalizeApproverRole(actor.getUser().getRoleId().getRoleName());
        if ("SUPER_ADMIN".equals(role)) return "Super Admin";
        if ("HRD_ADMIN".equals(role)) return "HR Admin";
        return "Admin";
    }

    // [BARU] Role akun -> kode tahap approval (HRD_ADMIN/HRD_KARYAWAN -> "HRD").
    private String resolveApprovalStageRole(Employee employee) {
        String roleName = employee.getUser().getRoleId().getRoleName();
        return HrdApproverPolicy.isHrdRoleName(roleName) ? ROLE_HRD : normalizeApproverRole(roleName);
    }

    private String normalizeApproverRole(String roleName) {
        return roleName == null ? "" : roleName.trim().toUpperCase(Locale.ROOT);
    }

    private void validateCoveredBy(String coveredBy, Employee requester) {
        if (coveredBy == null || coveredBy.isBlank()) {
            throw new RuntimeException("Dicover oleh wajib dipilih");
        }
        String requesterRole = normalizeApproverRole(requester.getUser().getRoleId().getRoleName());
        boolean validCover = karyawanRepository.findByFullNameContainingIgnoreCase(coveredBy.trim()).stream()
                .filter(employee -> Boolean.TRUE.equals(employee.getIsActive()))
                .filter(employee -> employee.getFullName().equalsIgnoreCase(coveredBy.trim()))
                .filter(employee -> employee.getDivisi() != null && requester.getDivisi() != null
                        && employee.getDivisi().getId().equals(requester.getDivisi().getId()))
                .anyMatch(employee -> requesterRole.equals(normalizeApproverRole(
                        employee.getUser().getRoleId().getRoleName())));
        if (!validCover) {
            throw new RuntimeException("Dicover oleh harus karyawan aktif dengan jenjang dan divisi yang sama");
        }
    }

    // [UBAH] Sekarang memakai listWorkingDays() di bawah supaya aturan hari kerja hanya ada satu.
    private int calculateWorkingDays(LocalDate startDate, LocalDate endDate) {
        return listWorkingDays(startDate, endDate, getHolidayDates(startDate, endDate)).size();
    }

    // [BARU] Tanggal libur nasional dalam rentang (dipakai export riwayat cuti per tanggal).
    public Set<LocalDate> getHolidayDates(LocalDate startDate, LocalDate endDate) {
        return holidayRepository.findByDateBetweenOrderByDateAsc(startDate, endDate).stream()
                .map(holiday -> holiday.getDate())
                .collect(Collectors.toSet());
    }

    // [BARU] Daftar hari kerja (bukan Sabtu/Minggu/libur) dalam rentang -- aturan yang sama dengan
    // penghitungan total hari saat cuti diajukan.
    public List<LocalDate> listWorkingDays(LocalDate startDate, LocalDate endDate, Set<LocalDate> holidays) {
        List<LocalDate> workingDays = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            DayOfWeek day = date.getDayOfWeek();
            boolean weekend = day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
            if (!weekend && !holidays.contains(date)) {
                workingDays.add(date);
            }
        }
        return workingDays;
    }

    // [UBAH] Overload 6-parameter (khusus baris auto-ACC Cuti Susulan) dihapus
    // karena alur susulan tidak lagi membuat baris approval.
    private LeaveRequestApproval buildApproval(LeaveRequest cuti, String role, Employee approver) {
        return LeaveRequestApproval.builder()
                .leaveRequest(cuti)
                .approverRole(role)
                .approverEmployee(approver)
                .action(ACTION_PENDING)
                .build();
    }
}
