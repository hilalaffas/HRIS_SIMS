package sys.hris.sims.attendance.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.attendance.dto.AttendanceResponse;
import sys.hris.sims.attendance.dto.AttendanceSubmitRequest;
import sys.hris.sims.attendance.dto.LeaveTodayResponse;
import sys.hris.sims.attendance.dto.PermissionSubmitRequest;
import sys.hris.sims.attendance.entity.Attendance;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.common.service.HrdApproverPolicy;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.storage.CloudinaryService;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;
import sys.hris.sims.holiday.repository.HolidayRepository;
import sys.hris.sims.notification.service.NotificationService;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    // [BARU] Jam batas dianggap "Tepat waktu" untuk check-in Masuk.
    // Sesuaikan kalau kebijakan jam masuk kantor berubah.
    private static final LocalTime ON_TIME_CUTOFF = LocalTime.of(8, 0);
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Jakarta");

    // [BARU] Pool kecil untuk pekerjaan I/O jaringan saat absen (pencarian nama lokasi). Thread daemon,
    // dibuat sesuai kebutuhan, sehingga tidak menghalangi shutdown dan tidak bergantung pada commonPool.
    private static final java.util.concurrent.ExecutorService ATTENDANCE_IO_EXECUTOR =
            java.util.concurrent.Executors.newCachedThreadPool(task -> {
                Thread thread = new Thread(task, "attendance-io");
                thread.setDaemon(true);
                return thread;
            });

    // [BARU] Durasi kerja minimum sebelum boleh check-out TANPA alasan. Di bawah
    // ini, keterangan (alasan pulang cepat) wajib diisi.
    private static final Duration MIN_WORK_DURATION = Duration.ofHours(8);

    // [UBAH] Batas lama izin sakit dalam satu pengajuan (HARI KERJA, Sabtu & Minggu tidak dihitung).
    private static final int MAX_SICK_DAYS = 30;


    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final CloudinaryService cloudinaryService;
    // [BARU] Nama lokasi dari koordinat GPS (Google Geocoding, opsional).
    private final ReverseGeocodingService reverseGeocodingService;
    private final WorkScheduleRepository workScheduleRepository;
    private final HolidayRepository holidayRepository;
    private final LeaveAttendancePolicy leaveAttendancePolicy; // [BARU] aturan cuti <-> absen
    private final NotificationService notificationService; // [BARU] notifikasi lonceng disimpan di database

    // Titik kantor dan toleransi radius menggunakan konfigurasi application.properties;
    // environment variable deployment dapat menimpa nilai default.
    @Value("${attendance.office.latitude:}")
    private String officeLatitudeConfig;

    @Value("${attendance.office.longitude:}")
    private String officeLongitudeConfig;

    @Value("${attendance.office.radius-meters:50}")
    private int officeRadiusMeters;

    public List<AttendanceResponse> getMyHistory(String username) {
        Employee employee = resolveEmployee(username);
        return attendanceRepository.findByEmployee_EmployeeIdOrderByRecordedAtDesc(employee.getEmployeeId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<AttendanceResponse> getAllHistory() {
        return attendanceRepository.findAllByOrderByRecordedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AttendanceResponse submit(String username, AttendanceSubmitRequest request) {
        Employee employee = resolveEmployee(username);

        String action = normalize(request.getAction());
        if (!action.equals("MASUK") && !action.equals("KELUAR")) {
            throw new IllegalArgumentException("Jenis absensi tidak valid. Gunakan Masuk atau Keluar.");
        }

        String reason = request.getReason() == null || request.getReason().isBlank()
                ? "ABSEN"
                : normalize(request.getReason());
        String locationType = request.getLocationType() == null || request.getLocationType().isBlank()
                ? "KANTOR" : normalize(request.getLocationType());
        if (action.equals("MASUK") && !List.of("KANTOR", "WFH_DINAS").contains(locationType)) {
            throw new IllegalArgumentException("Jenis lokasi absensi tidak valid.");
        }
        if (!List.of("ABSEN", "SAKIT", "IZIN").contains(reason)) {
            throw new IllegalArgumentException("Jenis keterangan tidak valid. Gunakan Absen, Sakit, atau Izin.");
        }
        if (!reason.equals("ABSEN") && (request.getNote() == null || request.getNote().isBlank())) {
            throw new IllegalArgumentException("Keterangan wajib diisi untuk absensi " + (reason.equals("SAKIT") ? "Sakit" : "Izin") + ".");
        }

        // [BARU] Batas panjang keterangan = kolom DB (attendances.note VARCHAR(255)).
        // Tanpa ini, input terlalu panjang berakhir sebagai error 500 dari database,
        // bukan pesan yang jelas ke pengguna.
        if (request.getNote() != null && request.getNote().trim().length() > 255) {
            throw new IllegalArgumentException("Keterangan maksimal 255 karakter.");
        }

        // [BARU] Koordinat GPS WAJIB -- tanpa ini absensi tidak bisa dikirim.
        // Frontend seharusnya sudah mencegah submit tanpa lokasi, ini adalah
        // jaring pengaman kedua di sisi server.
        if (request.getLatitude() == null || request.getLongitude() == null) {
            throw new IllegalArgumentException("Lokasi GPS wajib diaktifkan untuk melakukan absensi.");
        }
        if (request.getLatitude() < -90 || request.getLatitude() > 90
                || request.getLongitude() < -180 || request.getLongitude() > 180) {
            throw new IllegalArgumentException("Koordinat lokasi tidak valid.");
        }

        // Geofence wajib untuk absensi masuk yang memilih lokasi kantor.
        // WFH/Dinas tidak dibatasi oleh titik kantor.
        if (action.equals("MASUK") && locationType.equals("KANTOR")) {
            if (!isOfficeCoordinateConfigured()) {
                throw new IllegalStateException("Validasi titik kantor belum dikonfigurasi. Hubungi administrator.");
            }
            Integer officeDistance = officeDistanceMeters(
                    request.getLatitude(), request.getLongitude(), locationType);
            if (officeDistance != null && officeDistance > Math.max(0, officeRadiusMeters)) {
                int outsideMeters = officeDistance - Math.max(0, officeRadiusMeters);
                throw new IllegalArgumentException(
                        "Lokasi di luar jangkauan kantor (+" + outsideMeters
                                + " m). Pastikan Anda berada di area kantor untuk melakukan absensi.");
            }
        }

        if (action.equals("MASUK") && (request.getPhoto() == null || request.getPhoto().isEmpty())) {
            throw new IllegalArgumentException("Foto bukti kehadiran wajib diunggah.");
        }

        LocalDate today = LocalDate.now(APP_ZONE);
        LocalDateTime nowDateTime = LocalDateTime.now(APP_ZONE);
        var workday = AttendanceWorkday.resolve(employee, nowDateTime, action.equals("KELUAR"), workScheduleRepository, attendanceRepository);
        LocalDate workDate = workday.workDate();
        WorkSchedule schedule = workday.schedule();
        boolean shifting = employee.getDivisi() != null && "SHIFTING".equalsIgnoreCase(employee.getDivisi().getTipeDivisi());
        if (reason.equals("ABSEN") && shifting && (schedule == null || schedule.getShift() == null)) {
            throw new IllegalStateException(schedule == null ? "Jadwal shift Anda belum dipublikasikan untuk tanggal kerja ini." : "Jadwal Anda hari ini libur. Absensi tidak diperlukan.");
        }
        if (reason.equals("ABSEN") && action.equals("MASUK") && shifting
                && nowDateTime.isBefore(workDate.atTime(schedule.getShift().getStartTime()))) {
            throw new IllegalStateException("Absensi masuk belum dibuka. Shift Anda dimulai pukul " + schedule.getShift().getStartTime() + ".");
        }
        if (reason.equals("ABSEN") && action.equals("MASUK") && !shifting) {
            if (today.getDayOfWeek() == DayOfWeek.SATURDAY || today.getDayOfWeek() == DayOfWeek.SUNDAY)
                throw new IllegalStateException("Jadwal Regular libur setiap Sabtu dan Minggu.");
            if (holidayRepository.existsByDate(today)) throw new IllegalStateException("Hari ini libur nasional. Absensi masuk tidak diperlukan.");
        }
        // [BARU] Cuti yang sudah DISETUJUI: sehari penuh -> absen ditolak; setengah hari pagi ->
        // absen masuk baru dibuka satu jam sebelum cuti berakhir. Cuti PENDING tidak memblokir.
        // Hanya absen biasa (reason ABSEN); alur Sakit/Izin punya aturannya sendiri.
        LeaveAttendancePolicy.LeaveToday leaveToday = reason.equals("ABSEN")
                ? leaveAttendancePolicy.resolve(employee, workDate, schedule)
                : LeaveAttendancePolicy.LeaveToday.NONE;
        leaveAttendancePolicy.assertCanAttend(leaveToday, action, nowDateTime);

        if (attendanceRepository.existsActiveByAction(employee.getEmployeeId(), workDate, action)) { // sakit ditolak tidak menghalangi
            throw new IllegalStateException(
                    action.equals("MASUK")
                            ? "Anda sudah melakukan check-in hari ini."
                            : "Anda sudah melakukan check-out hari ini.");
        }
        // [BARU] Masih dalam masa izin sakit multi-hari (pengajuan hari sebelumnya).
        if (action.equals("MASUK") && hasActiveSick(employee.getEmployeeId(), workDate)) {
            throw new IllegalStateException("Anda tercatat sakit hari ini, absen masuk tidak diperlukan.");
        }
        if (action.equals("KELUAR")
                && !attendanceRepository.existsActiveByAction(employee.getEmployeeId(), workDate, "MASUK")) {
            throw new IllegalStateException("Anda belum melakukan check-in hari ini.");
        }
        // [BARU] Hari ini sudah tercatat Sakit/Izin -> tidak boleh check-out
        // (frontend sudah menonaktifkan tombol, ini pengaman di sisi server).
        if (action.equals("KELUAR")
                && attendanceRepository.existsActiveByActionAndReasonIn(
                        employee.getEmployeeId(), workDate, "MASUK", List.of("SAKIT", "IZIN"))) {
            throw new IllegalStateException("Anda tercatat Sakit/Izin hari ini, check-out tidak diperlukan.");
        }

        // [BARU] Pulang cepat: check-out sebelum 8 jam kerja WAJIB menyertakan alasan.
        // Popup peringatan di frontend hanya UX; aturan ini menjaga agar request yang
        // dikirim langsung ke API pun tidak bisa melewatinya. Dihitung dengan jam
        // SERVER (sama seperti Attendance.prePersist()), bukan jam perangkat.
        // [UBAH] Cuti setengah hari: karyawan memang hanya bekerja setengah shift, jadi
        // aturan durasi minimum ("pulang cepat") tidak berlaku.
        // [UBAH] Aturan alasan hanya berlaku SEBELUM jam pulang jadwal. Setelah jam pulang, check-out dianggap
        // normal walau karyawan datang terlambat (durasi kerja < 8 jam), sejalan dengan useCheckoutFlow.js.
        if (action.equals("KELUAR") && !leaveToday.isHalfDay()
                && nowDateTime.isBefore(getScheduledCheckoutTime(workDate, schedule)) // [BARU]
                && (request.getNote() == null || request.getNote().isBlank())) {
            WorkSchedule scheduleForCheckout = schedule;
            attendanceRepository
                    .findActiveByAction(employee.getEmployeeId(), workDate, "MASUK")
                    .ifPresent(checkIn -> {
                        Duration worked = Duration.between(checkIn.getRecordedAt(), LocalDateTime.now(APP_ZONE));
                        Duration required = getRequiredShiftDuration(scheduleForCheckout);
                        if (worked.compareTo(required) < 0) {
                            throw new IllegalArgumentException(
                                    "Durasi kerja belum memenuhi " + required.toHours() + " jam. Alasan pulang cepat wajib diisi.");
                        }
                    });
        }

        // [BARU] Nama lokasi dicari SERVER dari koordinat -- tidak menerima nama dari
        // klien supaya tidak bisa dipalsukan. Gagal/kosong tidak menghalangi absensi.
        // [UBAH] Performa: pencarian nama lokasi dan unggah foto ke Cloudinary sama-sama panggilan jaringan
        // yang tidak saling bergantung, jadi dijalankan BERSAMAAN (waktu tunggu = yang terlama, bukan jumlah
        // keduanya). Hasil, urutan validasi, dan pesan error tetap sama; resolveName() sendiri tidak pernah
        // melempar exception (gagal -> Optional kosong).
        java.util.concurrent.CompletableFuture<java.util.Optional<String>> locationFuture =
                java.util.concurrent.CompletableFuture.supplyAsync(
                        () -> reverseGeocodingService.resolveName(request.getLatitude(), request.getLongitude()),
                        ATTENDANCE_IO_EXECUTOR);

        String photoUrl = null;
        if (action.equals("MASUK")) {
            try {
                String publicId = "attendance-" + employee.getEmployeeId() + "-" + workDate + "-" + UUID.randomUUID();
                photoUrl = cloudinaryService.uploadAttendancePhoto(request.getPhoto(), publicId);
            } catch (IOException e) {
                throw new IllegalStateException("Gagal mengunggah foto absensi. Silakan coba lagi.", e);
            }
        }
        String locationName = locationFuture.join().orElse(null);

        Attendance attendance = Attendance.builder()
                .employee(employee)
                .action(action)
                .reason(reason)
                .status(resolveStatus(action, reason, schedule, workDate, leaveToday))
                .note(request.getNote())
                .approvalStatus(reason.equals("SAKIT") ? "PENDING" : "NOT_REQUIRED")
                .photoUrl(photoUrl)
                .latitude(BigDecimal.valueOf(request.getLatitude()))
                .longitude(BigDecimal.valueOf(request.getLongitude()))
                .locationName(locationName)
                .locationType(action.equals("MASUK") ? locationType : null)
                .officeDistanceMeters(action.equals("MASUK") && reason.equals("ABSEN")
                        ? officeDistanceMeters(request.getLatitude(), request.getLongitude(), locationType) : null)
                .officeLocationStatus(action.equals("MASUK") && reason.equals("ABSEN")
                        ? resolveOfficeLocationStatus(request.getLatitude(), request.getLongitude(), locationType) : null)
                .attendanceDate(workDate)
                .build();

        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    // [UBAH] Persetujuan Sakit & Izin dipegang HRD (HRD_ADMIN dan HRD_KARYAWAN). SecurityConfig sudah
    // membatasi endpoint-nya; pengecekan ini lapisan kedua. Mengembalikan data karyawan HRD yang login
    // supaya pengajuan miliknya sendiri bisa dikecualikan.
    private Employee requireHrdApprover(Authentication authentication) {
        if (!HrdApproverPolicy.hasHrdAuthority(authentication)) {
            throw new IllegalStateException("Hanya HRD yang berwenang memproses pengajuan sakit.");
        }
        return resolveEmployee(authentication.getName());
    }

    // [UBAH] Daftar pengajuan Sakit untuk halaman "Persetujuan Sakit & Izin" (HRD_ADMIN):
    // semua divisi, kecuali pengajuan milik HRD yang sedang login.
    public List<AttendanceResponse> getSickApprovals(Authentication authentication) {
        Long approverId = requireHrdApprover(authentication).getEmployeeId();
        return attendanceRepository.findByReasonOrderByRecordedAtDesc("SAKIT")
                .stream()
                .filter(attendance -> !approverId.equals(attendance.getEmployee().getEmployeeId()))
                .map(this::toResponse)
                .toList();
    }

    // [BARU] Pengajuan Izin / Sakit dari popup "Ajukan Izin / Sakit" -- TANPA selfie
    // & GPS.
    //  - SAKIT     : disimpan sebagai action MASUK + reason SAKIT (sama seperti sakit lama,
    //                jadi alur persetujuan Leader/SPV/Manager tidak berubah), plus lama
    //                izin (hari) dan surat dokter yang BOLEH menyusul (document_url null).
    //  - TERLAMBAT : pemberitahuan terlambat, disimpan sebagai action IZIN supaya tidak
    //                bentrok dengan absen Masuk yang tetap harus dilakukan; tidak perlu
    //                persetujuan.
    @Transactional
    public AttendanceResponse submitPermission(String username, PermissionSubmitRequest request) {
        Employee employee = resolveEmployee(username);
        Long employeeId = employee.getEmployeeId();

        String type = normalize(request.getType());
        boolean isSick = type.equals("SAKIT");
        if (!isSick && !type.equals("TERLAMBAT")) {
            throw new IllegalArgumentException("Jenis izin tidak valid. Gunakan Sakit atau Terlambat.");
        }

        // [BARU] Sedang cuti sehari penuh (sudah disetujui): tidak perlu izin sakit / terlambat.
        LocalDate permissionDate = LocalDate.now(APP_ZONE);
        if (!isSick && leaveAttendancePolicy.resolve(employee, permissionDate, null).mode()
                == LeaveAttendancePolicy.Mode.FULL_DAY) {
            throw new IllegalStateException("Anda sedang cuti hari ini, pengajuan izin tidak diperlukan.");
        }

        String note = request.getNote() == null ? "" : request.getNote().trim();
        if (note.isEmpty()) {
            throw new IllegalArgumentException("Keterangan wajib diisi.");
        }
        if (note.length() > 255) {
            throw new IllegalArgumentException("Keterangan maksimal 255 karakter.");
        }

        // [UBAH] Tanpa surat dokter (surat menyusul) lama izin dikunci 1 hari. Aturan ini
        // juga ditegakkan di sini -- bukan cuma di popup -- supaya request langsung ke API
        // tidak bisa mengajukan banyak hari tanpa bukti.
        boolean hasDocument = request.getDocument() != null && !request.getDocument().isEmpty();
        boolean earlyCheckout = request.isEarlyCheckout();
        if (earlyCheckout && (!isSick || !attendanceRepository.existsActiveByActionAndReasonIn(
                employeeId, permissionDate, "MASUK", List.of("ABSEN"))
                || attendanceRepository.existsActiveByAction(employeeId, permissionDate, "KELUAR"))) {
            throw new IllegalStateException("Izin sakit pulang cepat memerlukan check-in aktif dan belum check-out hari ini.");
        }
        SickPeriod period = isSick ? SickPeriod.resolve(request, permissionDate, hasDocument)
                : new SickPeriod(permissionDate, permissionDate, 1);
        double days = period.days();
        LocalDate today = period.start();
        if (isSick) {
            var history = attendanceRepository.findByEmployee_EmployeeIdOrderByRecordedAtDesc(employeeId);
            for (LocalDate date = period.start(); !date.isAfter(period.end()); date = date.plusDays(1)) {
                if (leaveAttendancePolicy.resolve(employee, date, null).mode() == LeaveAttendancePolicy.Mode.FULL_DAY)
                    throw new IllegalStateException("Rentang sakit bertabrakan dengan cuti yang sudah disetujui.");
                final LocalDate coveredDate = date;
                if (history.stream().anyMatch(record -> SickPeriod.covers(record, coveredDate)))
                    throw new IllegalStateException("Rentang tanggal sudah tercakup pengajuan sakit yang masih aktif.");
                if (!earlyCheckout && history.stream().anyMatch(record -> coveredDate.equals(record.getAttendanceDate())
                        && "ABSEN".equals(record.getReason()) && !"REJECTED".equals(record.getApprovalStatus())))
                    throw new IllegalStateException("Rentang sakit bertabrakan dengan absensi kehadiran yang sudah tercatat.");
            }
            if (!earlyCheckout && attendanceRepository.existsActiveByAction(employeeId, today, "MASUK"))
                throw new IllegalStateException("Sudah ada absensi masuk pada tanggal mulai sakit.");
        } else if (attendanceRepository.existsActiveByAction(employeeId, today, "MASUK")) {
            throw new IllegalStateException("Anda sudah tercatat check-in hari ini, pengajuan izin tidak bisa dibuat.");
        }
        if (!isSick && attendanceRepository.existsByEmployee_EmployeeIdAndAttendanceDateAndAction(employeeId, today, "IZIN")) {
            throw new IllegalStateException("Anda sudah mengajukan izin terlambat hari ini.");
        }

        // Surat dokter opsional saat pengajuan (boleh menyusul lewat uploadMedicalDocument).
        String documentUrl = null;
        MultipartFile document = request.getDocument();
        if (isSick && document != null && !document.isEmpty()) {
            documentUrl = storeMedicalDocument(employeeId, document);
        }

        Attendance attendance = Attendance.builder()
                .employee(employee)
                .action(isSick ? (earlyCheckout ? "SAKIT" : "MASUK") : "IZIN")
                .reason(isSick ? "SAKIT" : "IZIN")
                .status(isSick ? "SICK" : "IZIN")
                .note(note)
                .approvalStatus(isSick ? "PENDING" : "NOT_REQUIRED")
                .leaveDays(days)
                .attendanceDate(today)
                .sickStartDate(isSick ? period.start() : null)
                .sickEndDate(isSick ? period.end() : null)
                .documentUrl(documentUrl)
                .documentUploadDeadline(isSick ? SickDocumentDeadline.forSubmission(LocalDate.now(APP_ZONE)) : null)
                .documentRequired(isSick)
                .documentReviewStatus(isSick ? (documentUrl == null ? "NOT_UPLOADED" : "PENDING") : "NOT_REQUIRED")
                .build();

        return toResponse(attendanceRepository.save(attendance));
    }

    // [BARU] Upload surat dokter SUSULAN untuk pengajuan Sakit milik sendiri.
    // Lampiran hanya boleh diganti setelah HRD menolaknya.
    @Transactional
    public AttendanceResponse uploadMedicalDocument(Long attendanceId, MultipartFile document, String username) {
        return uploadMedicalDocument(attendanceId, document, username, null, null);
    }

    @Transactional
    public AttendanceResponse uploadMedicalDocument(Long attendanceId, MultipartFile document, String username,
                                                     LocalDate startDate, LocalDate endDate) {
        if (document == null || document.isEmpty()) {
            throw new IllegalArgumentException("File surat dokter wajib dipilih.");
        }

        Employee employee = resolveEmployee(username);
        Attendance attendance = attendanceRepository.findForDocumentUpdate(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Data absensi tidak ditemukan."));

        if (!attendance.getEmployee().getEmployeeId().equals(employee.getEmployeeId())) {
            throw new IllegalStateException("Anda tidak berwenang mengunggah surat untuk data ini.");
        }
        if (!"SAKIT".equals(attendance.getReason()) || !Boolean.TRUE.equals(attendance.getDocumentRequired())) {
            throw new IllegalArgumentException("Data ini tidak memerlukan surat dokter.");
        }
        if (attendance.getDocumentUrl() != null && !attendance.getDocumentUrl().isBlank()
                && !"REJECTED".equals(attendance.getDocumentReviewStatus())
                && !"REJECTED".equals(attendance.getApprovalStatus())) {
            throw new IllegalStateException("Surat dokter sudah diunggah.");
        }

        LocalDate deadline = SickDocumentDeadline.deadline(attendance);
        if (deadline != null && LocalDate.now(APP_ZONE).isAfter(deadline))
            throw new IllegalStateException("Batas upload surat dokter terlewati (" + deadline + ", 23.59 WIB).");

        SickPeriod proposed = documentPeriod(attendance, startDate, endDate);
        validateDocumentPeriod(attendance, proposed);
        attendance.setDocumentUrl(storeMedicalDocument(employee.getEmployeeId(), document));
        attendance.setDocumentStartDate(proposed.start());
        attendance.setDocumentEndDate(proposed.end());
        if ("REJECTED".equals(attendance.getApprovalStatus())) {
            attendance.setApprovalStatus("PENDING");
            attendance.setReviewNote(null);
            attendance.setReviewedAt(null);
        }
        attendance.setDocumentReviewStatus("PENDING");
        attendance.setDocumentReviewNote(null);
        attendance.setDocumentReviewedAt(null);
        return toResponse(attendanceRepository.save(attendance));
    }

    private String storeMedicalDocument(Long employeeId, MultipartFile document) {
        try {
            String publicId = "medical-" + employeeId + "-" + LocalDate.now() + "-" + UUID.randomUUID();
            return cloudinaryService.uploadMedicalDocument(document, publicId);
        } catch (IOException e) {
            throw new IllegalStateException("Gagal mengunggah surat dokter. Silakan coba lagi.", e);
        }
    }

    private boolean hasActiveSick(Long employeeId, LocalDate date) {
        return attendanceRepository.findByEmployee_EmployeeIdAndReasonAndActionOrderByRecordedAtDesc(employeeId, "SAKIT", "MASUK")
                .stream().anyMatch(record -> !SickDocumentDeadline.expired(record, LocalDate.now(APP_ZONE)) && SickPeriod.covers(record, date));
    }

    // [BARU] Setujui / tolak pengajuan Sakit. Hanya yang masih PENDING yang
    // bisa diputuskan, supaya keputusan tidak bolak-balik tanpa jejak.
    @Transactional
    public AttendanceResponse decideSick(Long attendanceId, String decision, String note, Authentication authentication, String documentUrl) {
        String status = normalize(decision);
        if (!status.equals("APPROVED") && !status.equals("REJECTED")) {
            throw new IllegalArgumentException("Keputusan tidak valid. Gunakan APPROVED atau REJECTED.");
        }

        Attendance attendance = attendanceRepository.findForDocumentUpdate(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Data absensi tidak ditemukan."));
        if (!"SAKIT".equals(attendance.getReason())) {
            throw new IllegalArgumentException("Hanya pengajuan Sakit yang bisa diputuskan.");
        }
        // [UBAH] Hanya HRD, dan tidak boleh memutuskan pengajuan sakit miliknya sendiri.
        Employee approver = requireHrdApprover(authentication);
        if (approver.getEmployeeId().equals(attendance.getEmployee().getEmployeeId())) {
            throw new IllegalStateException("Anda tidak dapat memproses pengajuan sakit milik sendiri.");
        }
        if (!"PENDING".equals(attendance.getApprovalStatus())) {
            throw new IllegalStateException("Pengajuan ini sudah diproses.");
        }

        // [BARU] Menolak WAJIB disertai catatan supaya karyawan tahu apa yang harus diperbaiki.
        String reviewNote = note == null ? "" : note.trim();
        if (status.equals("REJECTED") && reviewNote.length() < 3) {
            throw new IllegalArgumentException("Catatan untuk karyawan wajib diisi saat menolak.");
        }
        if (reviewNote.length() > 500) {
            throw new IllegalArgumentException("Catatan maksimal 500 karakter.");
        }

        if ("APPROVED".equals(status) && SickDocumentDeadline.expired(attendance, LocalDate.now(APP_ZONE)))
            throw new IllegalStateException("Batas upload surat dokter terlewati. Absensi dihitung tanpa keterangan.");

        // Approving an attached initial request also verifies the letter shown to HRD.
        if ("APPROVED".equals(status) && attendance.getDocumentUrl() != null
                && attendance.getDocumentUrl().equals(documentUrl)) {
            applyDocumentPeriod(attendance);
            attendance.setDocumentReviewStatus("VALID");
            attendance.setDocumentReviewNote(reviewNote.isEmpty() ? null : reviewNote);
            attendance.setDocumentReviewedAt(LocalDateTime.now(APP_ZONE));
        }
        if ("REJECTED".equals(status) && attendance.getDocumentUrl() != null && !attendance.getDocumentUrl().isBlank()) {
            attendance.setDocumentReviewStatus("REJECTED");
            attendance.setDocumentReviewNote(reviewNote);
            attendance.setDocumentReviewedAt(LocalDateTime.now(APP_ZONE));
        }
        attendance.setApprovalStatus(status);
        attendance.setReviewNote(reviewNote.isEmpty() ? null : reviewNote);
        attendance.setReviewedAt(LocalDateTime.now());
        Attendance decided = attendanceRepository.save(attendance);

        // [BARU] Kabari karyawan pemohon. Keputusan sudah tersimpan, jadi kegagalan
        // membuat notifikasi tidak boleh membatalkannya.
        try {
            Map<String, Object> params = new LinkedHashMap<>();
            params.put("attendanceId", decided.getAttendanceId());
            params.put("attendanceDate", String.valueOf(decided.getAttendanceDate()));
            params.put("daysCount", decided.getLeaveDays() == null ? 1 : decided.getLeaveDays().intValue());
            notificationService.notifyUser(decided.getEmployee().getUser(),
                    "APPROVED".equals(status) ? NotificationService.TYPE_SICK_APPROVED : NotificationService.TYPE_SICK_REJECTED,
                    decided.getAttendanceId(), params);
        } catch (Exception ex) {
            System.err.println("Gagal membuat notifikasi izin sakit: " + ex.getMessage());
        }
        return toResponse(decided);
    }

    @Transactional
    public AttendanceResponse reviewMedicalDocument(Long attendanceId, String decision, String note,
                                                    String documentUrl, Authentication authentication) {
        Employee approver = requireHrdApprover(authentication);
        Attendance attendance = attendanceRepository.findForDocumentUpdate(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Data absensi tidak ditemukan."));
        if (approver.getEmployeeId().equals(attendance.getEmployee().getEmployeeId()))
            throw new IllegalStateException("Anda tidak dapat memverifikasi surat milik sendiri.");
        if (!"SAKIT".equals(attendance.getReason()) || !Boolean.TRUE.equals(attendance.getDocumentRequired())
                || !"APPROVED".equals(attendance.getApprovalStatus()))
            throw new IllegalStateException("Verifikasi surat susulan hanya untuk izin sakit yang disetujui.");
        if (attendance.getDocumentUrl() == null || attendance.getDocumentUrl().isBlank())
            throw new IllegalStateException("Surat dokter belum diunggah.");
        if (!attendance.getDocumentUrl().equals(documentUrl))
            throw new IllegalStateException("Lampiran telah berubah. Muat ulang dan periksa surat terbaru.");
        if (!"PENDING".equals(attendance.getDocumentReviewStatus()))
            throw new IllegalStateException("Surat dokter ini sudah diverifikasi.");
        String status = normalize(decision);
        if (!List.of("VALID", "REJECTED").contains(status))
            throw new IllegalArgumentException("Keputusan surat tidak valid.");
        String reviewNote = note == null ? "" : note.trim();
        if (("REJECTED".equals(status) && reviewNote.length() < 3) || reviewNote.length() > 500)
            throw new IllegalArgumentException("Catatan penolakan wajib 3–500 karakter, catatan lainnya maksimal 500 karakter.");
        if ("VALID".equals(status)) applyDocumentPeriod(attendance);
        attendance.setDocumentReviewStatus(status);
        attendance.setDocumentReviewNote(reviewNote.isEmpty() ? null : reviewNote);
        attendance.setDocumentReviewedAt(LocalDateTime.now(APP_ZONE));
        return toResponse(attendanceRepository.save(attendance));
    }

    private SickPeriod documentPeriod(Attendance attendance, LocalDate start, LocalDate end) {
        LocalDate originalStart = attendance.getSickStartDate() == null ? attendance.getAttendanceDate() : attendance.getSickStartDate();
        LocalDate originalEnd = attendance.getSickEndDate() == null
                ? ("SAKIT".equals(attendance.getAction()) ? originalStart : SickPeriod.legacyEnd(originalStart, attendance.getLeaveDays()))
                : attendance.getSickEndDate();
        if ((start == null) != (end == null)) throw new IllegalArgumentException("Dari tanggal dan sampai tanggal wajib diisi bersama.");
        if (start == null) { start = originalStart; end = originalEnd; }
        if ("SAKIT".equals(attendance.getAction())) {
            if (!start.equals(originalStart) || !end.equals(originalStart))
                throw new IllegalArgumentException("Periode pulang cepat tetap pada tanggal pengajuan. Untuk sakit hari berikutnya, buat pengajuan baru.");
            return new SickPeriod(start, end, attendance.getLeaveDays() == null ? 1 : attendance.getLeaveDays());
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1;
        if (days < 1 || days > 30) throw new IllegalArgumentException("Periode surat dokter harus 1–30 hari kalender.");
        return new SickPeriod(start, end, days);
    }

    private void validateDocumentPeriod(Attendance attendance, SickPeriod period) {
        Employee employee = attendance.getEmployee();
        var history = attendanceRepository.findByEmployee_EmployeeIdOrderByRecordedAtDesc(employee.getEmployeeId());
        for (LocalDate date = period.start(); !date.isAfter(period.end()); date = date.plusDays(1)) {
            if (leaveAttendancePolicy.resolve(employee, date, null).mode() == LeaveAttendancePolicy.Mode.FULL_DAY)
                throw new IllegalStateException("Periode surat bertabrakan dengan cuti yang sudah disetujui.");
            final LocalDate day = date;
            if (history.stream().filter(other -> !java.util.Objects.equals(other.getAttendanceId(), attendance.getAttendanceId()))
                    .anyMatch(other -> SickPeriod.covers(other, day)))
                throw new IllegalStateException("Periode surat bertabrakan dengan pengajuan sakit lain.");
            if (!"SAKIT".equals(attendance.getAction()) && history.stream().anyMatch(other -> day.equals(other.getAttendanceDate())
                    && "ABSEN".equals(other.getReason()) && !"REJECTED".equals(other.getApprovalStatus())))
                throw new IllegalStateException("Periode surat bertabrakan dengan kehadiran yang sudah tercatat.");
        }
    }

    private void applyDocumentPeriod(Attendance attendance) {
        if (attendance.getDocumentStartDate() == null || attendance.getDocumentEndDate() == null) return;
        SickPeriod proposed = documentPeriod(attendance, attendance.getDocumentStartDate(), attendance.getDocumentEndDate());
        validateDocumentPeriod(attendance, proposed); // Recheck: attendance or leave may have changed while waiting.
        if ("MASUK".equals(attendance.getAction())) attendance.setAttendanceDate(proposed.start());
        attendance.setSickStartDate(proposed.start());
        attendance.setSickEndDate(proposed.end());
        attendance.setLeaveDays(proposed.days());
    }

    // ===================== ALAT DEV (panel /devAccess) =====================
    // Dipanggil DevToolsController (sudah dibatasi akun dev). HANYA data Izin/Sakit
    // yang boleh disentuh -- absen Masuk/Keluar biasa tidak bisa dihapus lewat sini.
    private static final List<String> PERMISSION_REASONS = List.of("SAKIT", "IZIN");

    public List<AttendanceResponse> getPermissionRecordsForDev(String username) {
        String query = username == null ? "" : username.trim();
        if (query.isEmpty()) {
            throw new IllegalArgumentException("Username karyawan wajib diisi.");
        }
        return attendanceRepository
                .findByEmployee_User_UsernameIgnoreCaseAndReasonInOrderByRecordedAtDesc(query, PERMISSION_REASONS)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Kembalikan status persetujuan Sakit ke PENDING supaya approve/tolak bisa diuji ulang.
    public AttendanceResponse resetSickApprovalForDev(Long attendanceId) {
        Attendance attendance = findPermissionRecordForDev(attendanceId);
        if (!"SAKIT".equals(attendance.getReason())) {
            throw new IllegalArgumentException("Hanya pengajuan Sakit yang punya status persetujuan.");
        }
        // Data yang DITOLAK sudah tidak memakai jatah Masuk harinya; mengembalikannya ke
        // Menunggu bentrok bila di tanggal itu sudah ada absen Masuk / pengajuan aktif lain.
        if ("REJECTED".equals(attendance.getApprovalStatus())
                && attendanceRepository.existsActiveByAction(
                        attendance.getEmployee().getEmployeeId(), attendance.getAttendanceDate(), "MASUK")) {
            throw new IllegalStateException(
                    "Di tanggal itu sudah ada absen Masuk / pengajuan aktif lain. Hapus dulu data tersebut.");
        }
        attendance.setApprovalStatus("PENDING");
        attendance.setReviewNote(null);
        attendance.setReviewedAt(null);
        return toResponse(attendanceRepository.save(attendance));
    }

    // Hapus satu data Izin/Sakit. File surat dokter di Cloudinary dibiarkan (hanya tautannya yang hilang).
    public AttendanceResponse deletePermissionRecordForDev(Long attendanceId) {
        Attendance attendance = findPermissionRecordForDev(attendanceId);
        AttendanceResponse snapshot = toResponse(attendance);
        attendanceRepository.delete(attendance);
        return snapshot;
    }

    private Attendance findPermissionRecordForDev(Long attendanceId) {
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Data absensi tidak ditemukan."));
        if (!PERMISSION_REASONS.contains(attendance.getReason())) {
            throw new IllegalArgumentException("Hanya data Izin/Sakit yang bisa direset dari panel dev.");
        }
        return attendance;
    }

    private String resolveStatus(String action, String reason, WorkSchedule schedule, LocalDate workDate,
                                 LeaveAttendancePolicy.LeaveToday leaveToday) {
        if (reason.equals("SAKIT")) return "SICK";
        if (reason.equals("IZIN")) return "IZIN";
        if (action.equals("KELUAR")) return "DONE";
        // MASUK + ABSEN -- dibandingkan ke jam server (sumber kebenaran),
        // bukan jam yang (mungkin) dikirim dari perangkat klien.
        // [UBAH] Cuti setengah hari pagi: batas tepat waktu = akhir cuti, bukan jam masuk shift
        // (kalau tidak, karyawan yang absen jam 12:00 langsung tercatat terlambat).
        LocalDateTime cutoff = leaveToday.mode() == LeaveAttendancePolicy.Mode.HALF_MORNING
                ? leaveToday.boundary()
                : LocalDateTime.of(workDate,
                        schedule != null && schedule.getShift() != null
                                ? schedule.getShift().getStartTime() : ON_TIME_CUTOFF);
        return LocalDateTime.now(APP_ZONE).isAfter(cutoff) ? "LATE" : "ON_TIME";
    }

    // [BARU] Status cuti hari ini untuk tombol absen (GET /api/absensi/me/leave-today).
    @Transactional(readOnly = true)
    public LeaveTodayResponse getMyLeaveToday(String username) {
        Employee employee = resolveEmployee(username);
        LocalDate today = LocalDate.now(APP_ZONE);
        LeaveAttendancePolicy.LeaveToday leave = leaveAttendancePolicy.resolve(
                employee, today, findSchedule(employee.getEmployeeId(), today));
        return new LeaveTodayResponse(leave.mode().name(), leave.leaveTypeName(), leave.boundary(), leave.opensAt());
    }

    private WorkSchedule findSchedule(Long employeeId, LocalDate date) {
        return workScheduleRepository.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
                        employeeId, date, date)
                .stream().findFirst().orElse(null);
    }

    // [BARU] Waktu pulang terjadwal (shift malam: selesai di hari berikutnya). Tanpa jadwal -> 08:00-17:00.
    private LocalDateTime getScheduledCheckoutTime(LocalDate workDate, WorkSchedule schedule) {
        LocalTime start = LocalTime.of(8, 0);
        LocalTime end = LocalTime.of(17, 0);
        if (schedule != null && schedule.getShift() != null) {
            start = schedule.getShift().getStartTime();
            end = schedule.getShift().getEndTime();
        }
        LocalDate endDate = !end.isAfter(start) ? workDate.plusDays(1) : workDate;
        return LocalDateTime.of(endDate, end);
    }

    private Duration getRequiredShiftDuration(WorkSchedule schedule) {
        if (schedule == null || schedule.getShift() == null) return MIN_WORK_DURATION;
        LocalTime start = schedule.getShift().getStartTime();
        LocalTime end = schedule.getShift().getEndTime();
        long minutes = (end.toSecondOfDay() - start.toSecondOfDay() + 24L * 60 * 60) % (24L * 60 * 60) / 60;
        return Duration.ofMinutes(minutes == 0 ? 8 * 60 : minutes);
    }

    private Employee resolveEmployee(String username) {
        return employeeRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new IllegalStateException("Data karyawan tidak ditemukan untuk user ini"));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    // [UBAH] private -> package-private: dipakai juga AttendanceReportService
    // (satu sumber pemetaan entity -> response, tidak diduplikasi).
    AttendanceResponse toResponse(Attendance attendance) {
        return AttendanceResponse.builder()
                .attendanceId(attendance.getAttendanceId())
                .employeeId(attendance.getEmployee().getEmployeeId())
                .employeeName(attendance.getEmployee().getFullName())
                .action(attendance.getAction())
                .reason(attendance.getReason())
                .status(attendance.getStatus())
                .note(attendance.getNote())
                .photoUrl(attendance.getPhotoUrl())
                .latitude(attendance.getLatitude())
                .longitude(attendance.getLongitude())
                .mapsUrl(buildMapsUrl(attendance.getLatitude(), attendance.getLongitude()))
                .recordedAt(attendance.getRecordedAt())
                .attendanceDate(attendance.getAttendanceDate())
                .approvalStatus(attendance.getApprovalStatus())
                .locationName(attendance.getLocationName())
                .locationType(attendance.getLocationType())
                .officeDistanceMeters(attendance.getOfficeDistanceMeters())
                .officeLocationStatus(attendance.getOfficeLocationStatus())
                .leaveDays(attendance.getLeaveDays())
                .sickStartDate(attendance.getSickStartDate())
                .sickEndDate(attendance.getSickEndDate())
                .documentUrl(attendance.getDocumentUrl())
                .documentRequired(attendance.getDocumentRequired())
                .documentUploadDeadline(SickDocumentDeadline.deadline(attendance))
                .documentDeadlineExpired(SickDocumentDeadline.expired(attendance, LocalDate.now(APP_ZONE)))
                .documentReviewStatus(attendance.getDocumentReviewStatus())
                .documentStartDate(attendance.getDocumentStartDate())
                .documentEndDate(attendance.getDocumentEndDate())
                .documentReviewNote(attendance.getDocumentReviewNote())
                .documentReviewedAt(attendance.getDocumentReviewedAt())
                .divisionName(attendance.getEmployee().getDivisi() == null
                        ? null : attendance.getEmployee().getDivisi().getNamaDivisi())
                .reviewNote(attendance.getReviewNote())
                .reviewedAt(attendance.getReviewedAt())
                .build();
    }

    private Integer officeDistanceMeters(Double latitude, Double longitude, String locationType) {
        if (!"KANTOR".equals(locationType) || latitude == null || longitude == null
                || !isOfficeCoordinateConfigured()) return null;
        double officeLat = Double.parseDouble(officeLatitudeConfig.trim());
        double officeLng = Double.parseDouble(officeLongitudeConfig.trim());
        return (int) Math.round(haversineMeters(latitude, longitude, officeLat, officeLng));
    }

    private String resolveOfficeLocationStatus(Double latitude, Double longitude, String locationType) {
        if (!"KANTOR".equals(locationType)) return "NOT_APPLICABLE";
        if (latitude == null || longitude == null || !isOfficeCoordinateConfigured()) return "NOT_CONFIGURED";
        Integer distance = officeDistanceMeters(latitude, longitude, locationType);
        return distance != null && distance > Math.max(0, officeRadiusMeters) ? "TOO_FAR" : "WITHIN_RADIUS";
    }

    private boolean isOfficeCoordinateConfigured() {
        if (officeLatitudeConfig == null || officeLongitudeConfig == null
                || officeLatitudeConfig.isBlank() || officeLongitudeConfig.isBlank()) return false;
        try {
            double lat = Double.parseDouble(officeLatitudeConfig.trim());
            double lng = Double.parseDouble(officeLongitudeConfig.trim());
            return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
        } catch (NumberFormatException ex) {
            return false;
        }
    }

    private double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        final double earthRadiusMeters = 6_371_000d;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        a = Math.max(0d, Math.min(1d, a));
        return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private String buildMapsUrl(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) return null; // [BARU] izin/sakit tanpa GPS
        return "https://www.google.com/maps?q=" + latitude.toPlainString() + "," + longitude.toPlainString();
    }
}
