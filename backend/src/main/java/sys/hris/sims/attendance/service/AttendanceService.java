package sys.hris.sims.attendance.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.common.service.ApprovalScopeService;
import sys.hris.sims.common.service.ApprovalScopeService.ApprovalScope;
import sys.hris.sims.attendance.dto.AttendanceResponse;
import sys.hris.sims.attendance.dto.AttendanceSubmitRequest;
import sys.hris.sims.attendance.dto.PermissionSubmitRequest;
import sys.hris.sims.attendance.entity.Attendance;
import sys.hris.sims.attendance.repository.AttendanceRepository;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.storage.CloudinaryService;
import sys.hris.sims.schedule.entity.WorkSchedule;
import sys.hris.sims.schedule.repository.WorkScheduleRepository;
import sys.hris.sims.holiday.repository.HolidayRepository;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    // [BARU] Jam batas dianggap "Tepat waktu" untuk check-in Masuk.
    // Sesuaikan kalau kebijakan jam masuk kantor berubah.
    private static final LocalTime ON_TIME_CUTOFF = LocalTime.of(8, 0);
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Jakarta");

    // [BARU] Durasi kerja minimum sebelum boleh check-out TANPA alasan. Di bawah
    // ini, keterangan (alasan pulang cepat) wajib diisi.
    private static final Duration MIN_WORK_DURATION = Duration.ofHours(8);

    // [UBAH] Batas lama izin sakit dalam satu pengajuan (HARI KERJA, Sabtu & Minggu tidak dihitung).
    private static final int MAX_SICK_DAYS = 30;

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final CloudinaryService cloudinaryService;
    // [BARU] Aturan siapa boleh melihat / memutuskan sakit siapa.
    private final ApprovalScopeService approvalScopeService;
    // [BARU] Nama lokasi dari koordinat GPS (Google Geocoding, opsional).
    private final ReverseGeocodingService reverseGeocodingService;
    private final WorkScheduleRepository workScheduleRepository;
    private final HolidayRepository holidayRepository;

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

        if (request.getPhoto() == null || request.getPhoto().isEmpty()) {
            throw new IllegalArgumentException("Foto bukti kehadiran wajib diunggah.");
        }

        LocalDate today = LocalDate.now(APP_ZONE);
        LocalDateTime nowDateTime = LocalDateTime.now(APP_ZONE);
        LocalDate workDate = today;
        WorkSchedule schedule = findSchedule(employee.getEmployeeId(), today);
        boolean shifting = employee.getDivisi() != null
                && "SHIFTING".equalsIgnoreCase(employee.getDivisi().getTipeDivisi());

        if (reason.equals("ABSEN") && action.equals("MASUK") && shifting
                && (schedule == null || schedule.getShift() == null)) {
            WorkSchedule overnight = findSchedule(employee.getEmployeeId(), today.minusDays(1));
            if (overnight != null && overnight.getShift() != null
                    && overnight.getShift().getEndTime().isBefore(overnight.getShift().getStartTime())
                    && nowDateTime.isBefore(LocalDateTime.of(today, overnight.getShift().getEndTime()))) {
                workDate = today.minusDays(1);
                schedule = overnight;
            } else if (schedule == null) {
                throw new IllegalStateException("Jadwal shift Anda belum dipublikasikan untuk hari ini.");
            }
        }
        if (reason.equals("ABSEN") && action.equals("MASUK") && shifting && schedule != null
                && schedule.getShift() != null && schedule.getShift().getStartTime().isBefore(schedule.getShift().getEndTime())
                && nowDateTime.isBefore(LocalDateTime.of(today, schedule.getShift().getStartTime()))) {
            throw new IllegalStateException("Absensi masuk belum dibuka. Shift Anda dimulai pukul "
                    + schedule.getShift().getStartTime() + ".");
        }
        if (reason.equals("ABSEN") && action.equals("MASUK") && !shifting
                && (today.getDayOfWeek() == DayOfWeek.SATURDAY || today.getDayOfWeek() == DayOfWeek.SUNDAY)) {
            throw new IllegalStateException("Jadwal Regular libur setiap Sabtu dan Minggu.");
        }
        if (reason.equals("ABSEN") && action.equals("MASUK") && !shifting && holidayRepository.existsByDate(today)) {
            throw new IllegalStateException("Hari ini libur nasional. Absensi masuk tidak diperlukan.");
        }
        if (reason.equals("ABSEN") && action.equals("MASUK") && schedule != null && schedule.getShift() == null) {
            throw new IllegalStateException("Jadwal Anda hari ini libur. Absensi masuk tidak diperlukan.");
        }

        if (reason.equals("ABSEN") && action.equals("KELUAR")) {
            boolean checkedInToday = attendanceRepository.existsActiveByAction(employee.getEmployeeId(), today, "MASUK");
            if (!checkedInToday) {
                WorkSchedule overnight = findSchedule(employee.getEmployeeId(), today.minusDays(1));
                boolean hasOvernightCheckIn = attendanceRepository.existsActiveByAction(
                        employee.getEmployeeId(), today.minusDays(1), "MASUK");
                if (hasOvernightCheckIn && overnight != null && overnight.getShift() != null
                        && overnight.getShift().getEndTime().isBefore(overnight.getShift().getStartTime())
                        && nowDateTime.isBefore(LocalDateTime.of(today, overnight.getShift().getEndTime()))) {
                    workDate = today.minusDays(1);
                    schedule = overnight;
                }
            }
        }
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
        if (action.equals("KELUAR") && (request.getNote() == null || request.getNote().isBlank())) {
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
        String locationName = reverseGeocodingService
                .resolveName(request.getLatitude(), request.getLongitude())
                .orElse(null);

        String photoUrl;
        try {
            String publicId = "attendance-" + employee.getEmployeeId() + "-" + workDate + "-" + UUID.randomUUID();
            photoUrl = cloudinaryService.uploadAttendancePhoto(request.getPhoto(), publicId);
        } catch (IOException e) {
            throw new IllegalStateException("Gagal mengunggah foto absensi. Silakan coba lagi.", e);
        }

        Attendance attendance = Attendance.builder()
                .employee(employee)
                .action(action)
                .reason(reason)
                .status(resolveStatus(action, reason, schedule, workDate))
                .note(request.getNote())
                .approvalStatus(reason.equals("SAKIT") ? "PENDING" : "NOT_REQUIRED")
                .photoUrl(photoUrl)
                .latitude(BigDecimal.valueOf(request.getLatitude()))
                .longitude(BigDecimal.valueOf(request.getLongitude()))
                .locationName(locationName)
                .attendanceDate(workDate)
                .build();

        Attendance saved = attendanceRepository.save(attendance);
        return toResponse(saved);
    }

    // [UBAH] Daftar pengajuan Sakit untuk tab "Izin Sakit" di Persetujuan Cuti:
    // hanya bawahan di divisi approver (lihat ApprovalScopeService).
    public List<AttendanceResponse> getSickApprovals(Authentication authentication) {
        ApprovalScope scope = approvalScopeService.resolve(authentication);
        return attendanceRepository.findByReasonAndActionOrderByRecordedAtDesc("SAKIT", "MASUK")
                .stream()
                .filter(attendance -> scope.canHandle(attendance.getEmployee()))
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
    public AttendanceResponse submitPermission(String username, PermissionSubmitRequest request) {
        Employee employee = resolveEmployee(username);
        Long employeeId = employee.getEmployeeId();

        String type = normalize(request.getType());
        boolean isSick = type.equals("SAKIT");
        if (!isSick && !type.equals("TERLAMBAT")) {
            throw new IllegalArgumentException("Jenis izin tidak valid. Gunakan Sakit atau Terlambat.");
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
        int days = isSick && hasDocument && request.getDays() != null ? request.getDays() : 1;
        if (days < 1 || days > MAX_SICK_DAYS) {
            throw new IllegalArgumentException("Lama izin sakit harus 1 sampai " + MAX_SICK_DAYS + " hari kerja.");
        }

        LocalDate today = LocalDate.now();
        // [UBAH] Pengajuan sakit yang DITOLAK tidak menghalangi pengajuan / absen baru.
        if (attendanceRepository.existsActiveByAction(employeeId, today, "MASUK")) {
            throw new IllegalStateException("Anda sudah tercatat check-in / sakit hari ini, pengajuan izin tidak bisa dibuat.");
        }
        if (isSick && hasActiveSick(employeeId, today)) {
            throw new IllegalStateException("Anda masih tercatat sakit hari ini dari pengajuan sebelumnya.");
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
                .action(isSick ? "MASUK" : "IZIN")
                .reason(isSick ? "SAKIT" : "IZIN")
                .status(isSick ? "SICK" : "IZIN")
                .note(note)
                .approvalStatus(isSick ? "PENDING" : "NOT_REQUIRED")
                .leaveDays(days)
                .documentUrl(documentUrl)
                .documentRequired(isSick)
                .build();

        return toResponse(attendanceRepository.save(attendance));
    }

    // [BARU] Upload surat dokter SUSULAN untuk pengajuan Sakit milik sendiri.
    // Hanya boleh sekali (selama masih kosong) supaya bukti yang sudah dilihat
    // approver tidak bisa diganti diam-diam.
    public AttendanceResponse uploadMedicalDocument(Long attendanceId, MultipartFile document, String username) {
        if (document == null || document.isEmpty()) {
            throw new IllegalArgumentException("File surat dokter wajib dipilih.");
        }

        Employee employee = resolveEmployee(username);
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Data absensi tidak ditemukan."));

        if (!attendance.getEmployee().getEmployeeId().equals(employee.getEmployeeId())) {
            throw new IllegalStateException("Anda tidak berwenang mengunggah surat untuk data ini.");
        }
        if (!"SAKIT".equals(attendance.getReason()) || !Boolean.TRUE.equals(attendance.getDocumentRequired())) {
            throw new IllegalArgumentException("Data ini tidak memerlukan surat dokter.");
        }
        if (attendance.getDocumentUrl() != null && !attendance.getDocumentUrl().isBlank()) {
            throw new IllegalStateException("Surat dokter sudah diunggah.");
        }

        attendance.setDocumentUrl(storeMedicalDocument(employee.getEmployeeId(), document));
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

    // [UBAH] true bila `date` masih tercakup pengajuan Sakit yang belum ditolak.
    // Lama izin dihitung dalam HARI KERJA (Sabtu & Minggu tidak dihitung), mulai
    // dari tanggal pengajuan -- lihat getSickEndDate(). Hari pengajuan selalu
    // tercakup; hari lanjutan yang jatuh di akhir pekan tidak.
    private boolean hasActiveSick(Long employeeId, LocalDate date) {
        return attendanceRepository
                .findByEmployee_EmployeeIdAndReasonAndActionOrderByRecordedAtDesc(employeeId, "SAKIT", "MASUK")
                .stream()
                .filter(sick -> !"REJECTED".equals(sick.getApprovalStatus()))
                .anyMatch(sick -> {
                    LocalDate start = sick.getAttendanceDate();
                    if (date.equals(start)) return true;
                    int days = sick.getLeaveDays() == null ? 1 : sick.getLeaveDays();
                    return date.isAfter(start) && !isWeekend(date) && !date.isAfter(getSickEndDate(start, days));
                });
    }

    // [BARU] Tanggal terakhir izin sakit: hari kerja ke-`days` terhitung dari `start`.
    // Bila `start` jatuh di akhir pekan, hitungan baru mulai Senin berikutnya.
    // Rumus yang sama dipakai frontend (utils/monthlyAttendance.js getSickEndKey).
    private LocalDate getSickEndDate(LocalDate start, int days) {
        LocalDate end = start;
        int counted = isWeekend(start) ? 0 : 1;
        while (counted < days) {
            end = end.plusDays(1);
            if (!isWeekend(end)) counted++;
        }
        return end;
    }

    private boolean isWeekend(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }

    // [BARU] Setujui / tolak pengajuan Sakit. Hanya yang masih PENDING yang
    // bisa diputuskan, supaya keputusan tidak bolak-balik tanpa jejak.
    public AttendanceResponse decideSick(Long attendanceId, String decision, String note, Authentication authentication) {
        String status = normalize(decision);
        if (!status.equals("APPROVED") && !status.equals("REJECTED")) {
            throw new IllegalArgumentException("Keputusan tidak valid. Gunakan APPROVED atau REJECTED.");
        }

        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new IllegalArgumentException("Data absensi tidak ditemukan."));
        if (!"SAKIT".equals(attendance.getReason())) {
            throw new IllegalArgumentException("Hanya pengajuan Sakit yang bisa diputuskan.");
        }
        // [BARU] Cegah memutuskan sakit di luar divisi / jenjang / milik sendiri.
        if (!approvalScopeService.resolve(authentication).canHandle(attendance.getEmployee())) {
            throw new IllegalStateException("Anda tidak berwenang memproses pengajuan sakit ini.");
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

        attendance.setApprovalStatus(status);
        attendance.setReviewNote(reviewNote.isEmpty() ? null : reviewNote);
        attendance.setReviewedAt(LocalDateTime.now());
        return toResponse(attendanceRepository.save(attendance));
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

    private String resolveStatus(String action, String reason, WorkSchedule schedule, LocalDate workDate) {
        if (reason.equals("SAKIT")) return "SICK";
        if (reason.equals("IZIN")) return "IZIN";
        if (action.equals("KELUAR")) return "DONE";
        // MASUK + ABSEN -- dibandingkan ke jam server (sumber kebenaran),
        // bukan jam yang (mungkin) dikirim dari perangkat klien.
        LocalDateTime cutoff = LocalDateTime.of(workDate,
                schedule != null && schedule.getShift() != null
                        ? schedule.getShift().getStartTime() : ON_TIME_CUTOFF);
        return LocalDateTime.now(APP_ZONE).isAfter(cutoff) ? "LATE" : "ON_TIME";
    }

    private WorkSchedule findSchedule(Long employeeId, LocalDate date) {
        return workScheduleRepository.findByEmployee_EmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
                        employeeId, date, date)
                .stream().findFirst().orElse(null);
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

    private AttendanceResponse toResponse(Attendance attendance) {
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
                .leaveDays(attendance.getLeaveDays())
                .documentUrl(attendance.getDocumentUrl())
                .documentRequired(attendance.getDocumentRequired())
                .divisionName(attendance.getEmployee().getDivisi() == null
                        ? null : attendance.getEmployee().getDivisi().getNamaDivisi())
                .reviewNote(attendance.getReviewNote())
                .reviewedAt(attendance.getReviewedAt())
                .build();
    }

    private String buildMapsUrl(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) return null; // [BARU] izin/sakit tanpa GPS
        return "https://www.google.com/maps?q=" + latitude.toPlainString() + "," + longitude.toPlainString();
    }
}
