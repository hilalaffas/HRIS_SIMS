package sys.hris.sims.devtools.controller;

import java.io.IOException; // [BARU]
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.function.Supplier; // [BARU]

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam; // [BARU]
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile; // [BARU]

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.devtools.dto.DevEmployeeRow;
import sys.hris.sims.devtools.dto.DevLeaveRow;
import sys.hris.sims.devtools.dto.ImportCsvRequest;
import sys.hris.sims.devtools.dto.ImportLeaveHistoryRequest; // [BARU]
import sys.hris.sims.devtools.dto.ImportResultResponse;
import sys.hris.sims.devtools.dto.UpdateLeaveRequest;
import sys.hris.sims.devtools.dto.UpdateNikRequest;
import sys.hris.sims.devtools.service.DevAccessService;
import sys.hris.sims.devtools.service.DevEmployeeDataService;
import sys.hris.sims.devtools.service.DevLeaveDataService;
import sys.hris.sims.devtools.service.DevLeaveHistoryService; // [BARU]
import sys.hris.sims.devtools.service.ImportValidationRegistry; // [BARU]
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] Import/export data karyawan, penyesuaian cuti, dan edit NIK untuk panel /devAccess.
// Dua lapis penjagaan, sama seperti DevToolsController:
//  1. SecurityConfig: /api/dev/** hanya role SUPER_ADMIN / DEV.
//  2. Di sini: harus akun dev (DevAccessService). Penolakan lewat ResponseEntity 403.
// Kesalahan input (IllegalArgumentException dari service) otomatis menjadi 400 + pesan
// lewat GlobalExceptionHandler. Setiap aksi tulis dicatat ke activity log.
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class DevDataController {

    private static final String FORBIDDEN_MESSAGE = "Hanya akun dev yang boleh memakai alat ini.";
    private static final MediaType CSV_UTF8 = new MediaType("text", "csv", StandardCharsets.UTF_8);
    // [BARU] Batas file Excel import riwayat cuti (sama dengan batas file CSV di frontend).
    private static final long MAX_XLSX_BYTES = 2L * 1024 * 1024;
    // [BARU] Jenis import untuk gerbang Pre-flight Validation (ImportValidationRegistry).
    private static final String KIND_EMPLOYEES = "EMPLOYEES";
    private static final String KIND_LEAVE_BALANCE = "LEAVE_BALANCE";
    private static final String KIND_LEAVE_HISTORY_CSV = "LEAVE_HISTORY_CSV";
    private static final String KIND_LEAVE_HISTORY_XLSX = "LEAVE_HISTORY_XLSX";

    private final DevAccessService devAccessService;
    private final DevEmployeeDataService employeeDataService;
    private final DevLeaveDataService leaveDataService;
    private final DevLeaveHistoryService leaveHistoryService; // [BARU]
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;
    private final ImportValidationRegistry validationRegistry; // [BARU]

    private boolean isDevAccount(Authentication authentication) {
        return devAccessService.isDevAccount(authentication.getName());
    }

    private ResponseEntity<String> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(FORBIDDEN_MESSAGE);
    }

    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    private void log(Authentication authentication, HttpServletRequest httpRequest,
                     String action, String entity, Long entityId, String description) {
        activityLogService.log(authentication.getName(), getCurrentUserId(authentication),
                action, entity, entityId, description, httpRequest);
    }

    private static ResponseEntity<String> csvResponse(String csv) {
        return ResponseEntity.ok().contentType(CSV_UTF8).body(csv);
    }

    // [BARU] Gerbang Pre-flight Validation untuk SEMUA import:
    //  - dryRun = true  -> jalankan validasi (tidak ada yang disimpan), lalu catat sidik jari isi file.
    //  - dryRun = false -> hanya berjalan bila isi file + opsi yang sama baru saja divalidasi akun ini.
    private ImportResultResponse runGuardedImport(Authentication authentication, String kind, String digest,
                                                  boolean dryRun, Supplier<ImportResultResponse> action) {
        if (dryRun) {
            ImportResultResponse result = action.get();
            validationRegistry.remember(authentication.getName(), kind, digest);
            return result;
        }
        validationRegistry.requireValidated(authentication.getName(), kind, digest);
        return action.get();
    }

    // ============================== KARYAWAN ==============================

    // Daftar karyawan (tanpa akun dev) untuk panel edit NIK.
    @GetMapping("/employees")
    public ResponseEntity<?> listEmployees(Authentication authentication) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        List<DevEmployeeRow> rows = employeeDataService.listEmployees();
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/employees/export")
    public ResponseEntity<?> exportEmployees(Authentication authentication, HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        String csv = employeeDataService.exportCsv();
        log(authentication, httpRequest, "DEV_EXPORT_KARYAWAN", "employees", null,
                "Dev: ekspor data karyawan ke CSV");
        return csvResponse(csv);
    }

    @PostMapping("/employees/import")
    public ResponseEntity<?> importEmployees(@RequestBody ImportCsvRequest request,
                                             Authentication authentication,
                                             HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        boolean dryRun = Boolean.TRUE.equals(request.dryRun()); // [BARU] Pre-flight Validation
        String digest = ImportValidationRegistry.digestOfText(KIND_EMPLOYEES, "", request.csvText());
        ImportResultResponse result = runGuardedImport(authentication, KIND_EMPLOYEES, digest, dryRun,
                () -> employeeDataService.importCsv(request.csvText(), request.defaultPassword(), dryRun)); // [UBAH]
        if (!dryRun) { // [UBAH] validasi tidak dicatat sebagai perubahan data
            log(authentication, httpRequest, "DEV_IMPORT_KARYAWAN", "employees", null,
                    "Dev: import karyawan dari CSV (" + result.success() + " ditambahkan, "
                            + result.skipped() + " dilewati dari " + result.total() + " baris)");
        }
        return ResponseEntity.ok(result);
    }

    @PutMapping("/employees/{employeeId}/nik")
    public ResponseEntity<?> updateNik(@PathVariable Long employeeId,
                                       @RequestBody UpdateNikRequest request,
                                       Authentication authentication,
                                       HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        DevEmployeeRow row = employeeDataService.updateNik(employeeId, request.nik());
        log(authentication, httpRequest, "DEV_UBAH_NIK", "employees", employeeId,
                "Dev: NIK " + row.fullName() + " diubah menjadi " + row.nikKaryawan());
        return ResponseEntity.ok(row);
    }

    // ============================== CUTI ==============================

    @GetMapping("/leave/employees")
    public ResponseEntity<?> listLeaveRows(Authentication authentication) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        List<DevLeaveRow> rows = leaveDataService.listRows();
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/leave/export")
    public ResponseEntity<?> exportLeave(Authentication authentication, HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        String csv = leaveDataService.exportCsv();
        log(authentication, httpRequest, "DEV_EXPORT_CUTI", "employees", null,
                "Dev: ekspor saldo cuti karyawan ke CSV");
        return csvResponse(csv);
    }

    @PostMapping("/leave/import")
    public ResponseEntity<?> importLeave(@RequestBody ImportCsvRequest request,
                                         Authentication authentication,
                                         HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        boolean dryRun = Boolean.TRUE.equals(request.dryRun()); // [BARU] Pre-flight Validation
        String digest = ImportValidationRegistry.digestOfText(KIND_LEAVE_BALANCE, "", request.csvText());
        ImportResultResponse result = runGuardedImport(authentication, KIND_LEAVE_BALANCE, digest, dryRun,
                () -> leaveDataService.importCsv(request.csvText(), dryRun)); // [UBAH]
        if (!dryRun) { // [UBAH]
            log(authentication, httpRequest, "DEV_IMPORT_CUTI", "employees", null,
                    "Dev: import saldo cuti dari CSV (" + result.success() + " diperbarui, "
                            + result.skipped() + " dilewati dari " + result.total() + " baris)");
        }
        return ResponseEntity.ok(result);
    }

    // ============================== RIWAYAT CUTI (format ledger) ==============================

    // [BARU] Export riwayat cuti per tanggal dengan bentuk yang sama seperti file ledger.
    // [UBAH] Parameter opsional: from & to (yyyy-MM-dd, diisi keduanya) membatasi periode.
    // Tanggal di file hasil export SELALU yyyy-MM-dd (parameter dateFormat dihapus).
    @GetMapping("/leave-history/export")
    public ResponseEntity<?> exportLeaveHistory(@RequestParam(required = false) String from,
                                                @RequestParam(required = false) String to,
                                                Authentication authentication,
                                                HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        LocalDate fromDate = parseOptionalDate(from, "Tanggal dari");
        LocalDate toDate = parseOptionalDate(to, "Tanggal sampai");
        String csv = leaveHistoryService.exportCsv(fromDate, toDate);
        log(authentication, httpRequest, "DEV_EXPORT_RIWAYAT_CUTI", "leave_requests", null,
                "Dev: ekspor riwayat cuti (format ledger) ke CSV"
                        + (fromDate == null ? "" : " periode " + fromDate + " s/d " + toDate));
        return csvResponse(csv);
    }

    // [BARU] Export riwayat cuti ke Excel (.xlsx). Tipe cuti selain cuti tahunan & setengah hari
    // ditulis sebagai komentar sel, jadi file ini bisa langsung di-import lagi.
    @GetMapping("/leave-history/export-xlsx")
    public ResponseEntity<?> exportLeaveHistoryXlsx(@RequestParam(required = false) String from,
                                                    @RequestParam(required = false) String to,
                                                    Authentication authentication,
                                                    HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        LocalDate fromDate = parseOptionalDate(from, "Tanggal dari");
        LocalDate toDate = parseOptionalDate(to, "Tanggal sampai");
        byte[] content = leaveHistoryService.exportXlsx(fromDate, toDate);
        log(authentication, httpRequest, "DEV_EXPORT_RIWAYAT_CUTI", "leave_requests", null,
                "Dev: ekspor riwayat cuti (format ledger) ke Excel"
                        + (fromDate == null ? "" : " periode " + fromDate + " s/d " + toDate));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }

    private static LocalDate parseOptionalDate(String value, String label) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(label + " tidak valid. Gunakan format YYYY-MM-DD.");
        }
    }

    // [BARU] Import riwayat cuti dari file format ledger. Riwayat tidak ikut hitung saldo (V56).
    @PostMapping("/leave-history/import")
    public ResponseEntity<?> importLeaveHistory(@RequestBody ImportLeaveHistoryRequest request,
                                                Authentication authentication,
                                                HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        boolean applyRemaining = Boolean.TRUE.equals(request.applyRemaining());
        boolean dryRun = Boolean.TRUE.equals(request.dryRun()); // [BARU] pratinjau tanpa menyimpan
        String digest = ImportValidationRegistry.digestOfText(
                KIND_LEAVE_HISTORY_CSV, "applyRemaining=" + applyRemaining, request.csvText()); // [BARU]
        ImportResultResponse result = runGuardedImport(authentication, KIND_LEAVE_HISTORY_CSV, digest, dryRun,
                () -> leaveHistoryService.importCsv(request.csvText(), applyRemaining, dryRun)); // [UBAH]
        if (!dryRun) {
            log(authentication, httpRequest, "DEV_IMPORT_RIWAYAT_CUTI", "leave_requests", null,
                    "Dev: import riwayat cuti dari CSV (" + result.success() + " tanggal ditambahkan, "
                            + result.skipped() + " dilewati)" + (applyRemaining ? ", sisa cuti ikut diterapkan" : ""));
        }
        return ResponseEntity.ok(result);
    }

    // [BARU] Import riwayat cuti dari file Excel (.xlsx). Bentuk sheet sama dengan ledger CSV;
    // KOMENTAR SEL dibaca sebagai tipe cuti (aturan lengkap: DevLeaveHistoryService).
    // multipart/form-data: file (.xlsx, maks 2 MB) + applyRemaining (opsional, true/false).
    @PostMapping(value = "/leave-history/import-xlsx", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> importLeaveHistoryXlsx(@RequestParam("file") MultipartFile file,
                                                    @RequestParam(value = "applyRemaining", defaultValue = "false") boolean applyRemaining,
                                                    @RequestParam(value = "dryRun", defaultValue = "false") boolean dryRun, // [BARU]
                                                    Authentication authentication,
                                                    HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        byte[] content = readXlsxUpload(file);
        String digest = ImportValidationRegistry.digestOf(
                KIND_LEAVE_HISTORY_XLSX, "applyRemaining=" + applyRemaining, content); // [BARU]
        ImportResultResponse result = runGuardedImport(authentication, KIND_LEAVE_HISTORY_XLSX, digest, dryRun,
                () -> leaveHistoryService.importXlsx(content, applyRemaining, dryRun)); // [UBAH]
        if (!dryRun) {
            log(authentication, httpRequest, "DEV_IMPORT_RIWAYAT_CUTI", "leave_requests", null,
                    "Dev: import riwayat cuti dari Excel (" + result.success() + " baris berhasil, "
                            + result.skipped() + " dilewati)" + (applyRemaining ? ", sisa cuti ikut diterapkan" : ""));
        }
        return ResponseEntity.ok(result);
    }

    // Pemeriksaan upload sebelum file dibaca POI: tidak kosong, <= 2 MB, ekstensi .xlsx, dan
    // diawali tanda "PK" (file .xlsx adalah arsip zip; .xls lama / file lain ditolak di sini).
    private static byte[] readXlsxUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File kosong. Pilih file Excel (.xlsx) terlebih dahulu.");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".xlsx")) {
            throw new IllegalArgumentException("File harus berformat .xlsx (bukan .xls, .xlsm, atau .csv).");
        }
        if (file.getSize() > MAX_XLSX_BYTES) {
            throw new IllegalArgumentException("Ukuran file melebihi 2 MB.");
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw new IllegalArgumentException("File tidak dapat dibaca. Coba pilih ulang.");
        }
        boolean looksLikeZip = content.length >= 4
                && content[0] == 'P' && content[1] == 'K' && content[2] == 3 && content[3] == 4;
        if (!looksLikeZip) {
            throw new IllegalArgumentException("Isi file bukan Excel .xlsx yang valid.");
        }
        return content;
    }

    @PutMapping("/leave/employees/{employeeId}")
    public ResponseEntity<?> updateLeave(@PathVariable Long employeeId,
                                         @RequestBody UpdateLeaveRequest request,
                                         Authentication authentication,
                                         HttpServletRequest httpRequest) {
        if (!isDevAccount(authentication)) {
            return forbidden();
        }
        DevLeaveRow row = leaveDataService.updateEmployee(employeeId, request);
        log(authentication, httpRequest, "DEV_UBAH_CUTI", "employees", employeeId,
                "Dev: penyesuaian cuti " + row.fullName() + " (tanggal masuk " + row.joinDate()
                        + ", sisa lama " + row.oldLeaveBalance() + ", sisa tahun berjalan "
                        + (row.eligible() ? row.annualRemaining() : "-") + ")");
        return ResponseEntity.ok(row);
    }
}
