package sys.hris.sims.devtools.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet; // [BARU]
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set; // [BARU]

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import sys.hris.sims.common.service.ReportScopeService;
import sys.hris.sims.devtools.dto.DevEmployeeRow;
import sys.hris.sims.devtools.dto.ImportResultResponse;
import sys.hris.sims.devtools.dto.ImportRowResult;
import sys.hris.sims.devtools.util.CsvUtil;
import sys.hris.sims.devtools.util.CsvUtil.CsvRow;
import sys.hris.sims.devtools.util.CsvUtil.CsvTable;
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.repository.DivisiRepository;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.entity.EmergencyContactRelationship;
import sys.hris.sims.employee.repository.EmergencyContactRelationshipRepository;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.role.entity.Roles;
import sys.hris.sims.role.repository.RoleRepository;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] Import / export data karyawan (CSV) dan edit NIK untuk panel /devAccess.
//
// Aturan import (sesuai kesepakatan):
//   - Murni MENAMBAH karyawan baru. Username yang sudah ada tidak pernah ditimpa -> baris dilewati.
//   - Tiap baris diproses di transaksi sendiri: baris bermasalah dilewati (beserta alasannya),
//     baris lain tetap masuk.
//   - Divisi / role / hubungan kontak darurat harus sudah ada di database, kalau tidak baris dilewati.
//   - Role DEV tidak boleh dipakai. Semua akun baru memakai SATU password default.
//   - NIK dikosongkan = dibuat otomatis oleh trigger (angka urut 4 digit, contoh 0021).
@Service
public class DevEmployeeDataService {

    private static final Logger log = LoggerFactory.getLogger(DevEmployeeDataService.class);

    static final List<String> HEADERS = List.of(
            "username", "email", "nama_lengkap", "jenis_kelamin", "tanggal_masuk", "divisi", "role",
            "jabatan", "no_telepon", "alamat", "kontak_darurat_nama", "kontak_darurat_telepon",
            "kontak_darurat_hubungan", "status", "nik");

    private static final List<String> REQUIRED_HEADERS = List.of(
            "username", "nama_lengkap", "jenis_kelamin", "tanggal_masuk", "divisi", "role");

    private static final int MAX_IMPORT_ROWS = 2000;
    private static final int MIN_PASSWORD_LENGTH = 4;
    private static final String FORBIDDEN_ROLE = "DEV";

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DivisiRepository divisiRepository;
    private final RoleRepository roleRepository;
    private final EmergencyContactRelationshipRepository relationshipRepository;
    private final PasswordEncoder passwordEncoder;
    private final DevAccessService devAccessService;
    private final DevNikService devNikService;
    private final ReportScopeService reportScopeService;
    private final TransactionTemplate transactionTemplate;

    public DevEmployeeDataService(UserRepository userRepository,
                                  EmployeeRepository employeeRepository,
                                  DivisiRepository divisiRepository,
                                  RoleRepository roleRepository,
                                  EmergencyContactRelationshipRepository relationshipRepository,
                                  PasswordEncoder passwordEncoder,
                                  DevAccessService devAccessService,
                                  DevNikService devNikService,
                                  ReportScopeService reportScopeService,
                                  PlatformTransactionManager transactionManager) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.divisiRepository = divisiRepository;
        this.roleRepository = roleRepository;
        this.relationshipRepository = relationshipRepository;
        this.passwordEncoder = passwordEncoder;
        this.devAccessService = devAccessService;
        this.devNikService = devNikService;
        this.reportScopeService = reportScopeService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    // Data pendukung yang dimuat sekali per import (nama dicocokkan tanpa membedakan huruf besar/kecil).
    private record ImportContext(
            Map<String, Divisi> divisiByName,
            Map<String, Roles> roleByName,
            Map<String, EmergencyContactRelationship> relationByName,
            String passwordHash) {
    }

    // ============================== DAFTAR (panel NIK) ==============================

    @Transactional(readOnly = true)
    public List<DevEmployeeRow> listEmployees() {
        return visibleEmployees().stream()
                .sorted(Comparator.comparing(Employee::getFullName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toRow)
                .toList();
    }

    @Transactional
    public DevEmployeeRow updateNik(Long employeeId, String nik) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Karyawan tidak ditemukan."));
        if (devAccessService.isDevAccount(employee.getUser().getUsername())) {
            throw new IllegalArgumentException("Akun dev tidak punya NIK karyawan.");
        }
        devNikService.applyNik(employeeId, nik);
        return toRow(employee);
    }

    private DevEmployeeRow toRow(Employee employee) {
        return new DevEmployeeRow(
                employee.getEmployeeId(),
                employee.getUser().getUsername(),
                employee.getFullName(),
                employee.getNikKaryawan(),
                employee.getJoinDate(),
                employee.getDivisi() == null ? null : employee.getDivisi().getNamaDivisi(),
                employee.getUser().getRoleId() == null ? null : employee.getUser().getRoleId().getRoleName());
    }

    private List<Employee> visibleEmployees() {
        return reportScopeService.withoutDevEmployees(employeeRepository.findAll());
    }

    // ============================== EXPORT ==============================

    @Transactional(readOnly = true)
    public String exportCsv() {
        List<List<String>> rows = new ArrayList<>();
        // [UBAH] Superadmin dan akun dev tidak ikut export.
        reportScopeService.onlyReportableEmployees(employeeRepository.findAll()).stream()
                .sorted(Comparator.comparing(Employee::getEmployeeId))
                .forEach(employee -> rows.add(toExportRow(employee)));
        return CsvUtil.write(HEADERS, rows);
    }

    private List<String> toExportRow(Employee employee) {
        User user = employee.getUser();
        EmergencyContactRelationship relation = employee.getEmergencyContactRelationship();
        return List.of(
                CsvUtil.safeText(user.getUsername()),
                CsvUtil.safeText(user.getEmail()),
                CsvUtil.safeText(employee.getFullName()),
                employee.getGender() == null ? "" : employee.getGender().trim(),
                employee.getJoinDate() == null ? "" : employee.getJoinDate().toString(),
                employee.getDivisi() == null ? "" : CsvUtil.safeText(employee.getDivisi().getNamaDivisi()),
                user.getRoleId() == null ? "" : user.getRoleId().getRoleName(),
                CsvUtil.safeText(employee.getPosition()),
                nullToEmpty(employee.getPhoneNumber()), // nomor telepon: sengaja tanpa safeText (boleh diawali +)
                CsvUtil.safeText(employee.getAddress()),
                CsvUtil.safeText(employee.getEmergencyContactName()),
                nullToEmpty(employee.getEmergencyContactPhone()),
                relation == null ? "" : relation.getName(),
                Boolean.TRUE.equals(employee.getIsActive()) ? "AKTIF" : "NONAKTIF",
                nullToEmpty(employee.getNikKaryawan()));
    }

    // ============================== IMPORT ==============================

    // [UBAH] Satu jalur validasi untuk Pre-flight Validation (dryRun = true) dan import sungguhan:
    // validateRow() memeriksa semua aturan TANPA menulis apa pun, persistEmployee() baru menyimpan.
    // Kenapa dryRun tidak memakai "simpan lalu rollback": NIK otomatis diambil dari sequence database
    // (nik_karyawan_seq) yang TIDAK ikut rollback, sehingga nomor NIK berurutan akan berlubang.
    //
    // Tanpa @Transactional di level method ini: tiap baris punya transaksi sendiri (TransactionTemplate).
    public ImportResultResponse importCsv(String csvText, String defaultPassword, boolean dryRun) {
        if (defaultPassword == null || defaultPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException(
                    "Password default wajib diisi (minimal " + MIN_PASSWORD_LENGTH + " karakter).");
        }

        CsvTable table = CsvUtil.parse(csvText);
        List<String> missing = REQUIRED_HEADERS.stream()
                .filter(header -> !table.headers().contains(header))
                .toList();
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("Kolom wajib tidak ditemukan di header CSV: " + String.join(", ", missing));
        }
        if (table.rows().isEmpty()) {
            throw new IllegalArgumentException("File CSV tidak berisi data karyawan.");
        }
        if (table.rows().size() > MAX_IMPORT_ROWS) {
            throw new IllegalArgumentException("Maksimal " + MAX_IMPORT_ROWS + " baris per import.");
        }

        ImportContext context = buildContext(defaultPassword, dryRun);
        List<ImportRowResult> results = new ArrayList<>();
        Set<String> seenUsernames = new HashSet<>(); // [BARU] deteksi duplikat di dalam file yang sama
        Set<String> seenNiks = new HashSet<>();

        for (CsvRow row : table.rows()) {
            String username = row.get("username");
            try {
                EmployeeDraft draft = validateRow(row, context, seenUsernames, seenNiks);
                if (!dryRun) {
                    transactionTemplate.executeWithoutResult(status -> persistEmployee(draft, context));
                }
                seenUsernames.add(key(draft.username()));
                if (draft.nik() != null) {
                    seenNiks.add(draft.nik());
                }
                results.add(ImportRowResult.success(row.number(), username, successMessage(draft, dryRun)));
            } catch (IllegalArgumentException ex) {
                results.add(ImportRowResult.skipped(row.number(), username, ex.getMessage()));
            } catch (DataIntegrityViolationException ex) {
                log.warn("Import karyawan baris {} ditolak database", row.number(), ex);
                results.add(ImportRowResult.skipped(row.number(), username,
                        "Ditolak database (data bentrok atau melebihi batas panjang kolom)."));
            } catch (RuntimeException ex) {
                log.error("Import karyawan baris {} gagal", row.number(), ex);
                results.add(ImportRowResult.skipped(row.number(), username, "Gagal diproses: " + ex.getMessage()));
            }
        }
        // [BARU] Setelah import sungguhan, nomor NIK berikutnya diselaraskan ke NIK terbesar + 1
        // (lihat DevNikService.resyncNextNik) dan ditampilkan di catatan hasil import.
        List<String> notes = dryRun
                ? List.of("Pre-flight Validation: belum ada data yang disimpan.")
                : List.of("NIK karyawan baru berikutnya: " + String.format("%04d", devNikService.resyncNextNik()) + ".");
        return ImportResultResponse.of(results, notes);
    }

    private static String successMessage(EmployeeDraft draft, boolean dryRun) {
        if (!dryRun) {
            return "Karyawan ditambahkan.";
        }
        return draft.nik() == null
                ? "Karyawan akan ditambahkan (NIK dibuat otomatis)."
                : "Karyawan akan ditambahkan (NIK " + draft.nik() + ").";
    }

    // [UBAH] passwordHash null pada dryRun: hash bcrypt tidak diperlukan karena tidak ada akun yang dibuat.
    private ImportContext buildContext(String defaultPassword, boolean dryRun) {
        Map<String, Divisi> divisiByName = new HashMap<>();
        divisiRepository.findAll().forEach(divisi -> divisiByName.put(key(divisi.getNamaDivisi()), divisi));

        Map<String, Roles> roleByName = new HashMap<>();
        roleRepository.findAll().forEach(role -> roleByName.put(key(role.getRoleName()), role));

        Map<String, EmergencyContactRelationship> relationByName = new HashMap<>();
        relationshipRepository.findAll().forEach(relation -> relationByName.put(key(relation.getName()), relation));

        String passwordHash = dryRun ? null : passwordEncoder.encode(defaultPassword);
        return new ImportContext(divisiByName, roleByName, relationByName, passwordHash);
    }

    // [BARU] Nilai satu baris yang sudah lolos validasi dan siap disimpan.
    private record EmployeeDraft(
            String username, String email, String fullName, String gender, LocalDate joinDate,
            Divisi divisi, Roles role, String position, String address, String phone,
            String emergencyName, String emergencyPhone, EmergencyContactRelationship relation,
            boolean active, String nik) {
    }

    // [UBAH] Dulu bagian atas createEmployee(). HANYA membaca & memeriksa -- tidak menulis ke database.
    // Melempar IllegalArgumentException (alasan baris dilewati).
    private EmployeeDraft validateRow(CsvRow row, ImportContext context, Set<String> seenUsernames, Set<String> seenNiks) {
        String username = required(row, "username", "Username");
        if (!username.matches("^[A-Za-z0-9._-]{3,50}$")) {
            throw new IllegalArgumentException(
                    "Username '" + username + "' tidak valid (3-50 karakter: huruf, angka, titik, garis bawah, strip).");
        }
        if (devAccessService.isDevAccount(username)) {
            throw new IllegalArgumentException("Username ini dicadangkan untuk akun dev.");
        }
        if (seenUsernames.contains(key(username))) { // [BARU]
            throw new IllegalArgumentException(
                    "Username '" + username + "' muncul lebih dari satu kali di file ini; hanya kemunculan pertama yang diproses.");
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Username '" + username + "' sudah terdaftar, tidak ditimpa.");
        }

        String fullName = limited(required(row, "nama_lengkap", "Nama lengkap"), 150, "Nama lengkap");
        String gender = parseGender(required(row, "jenis_kelamin", "Jenis kelamin"));
        LocalDate joinDate = CsvUtil.parseDate(required(row, "tanggal_masuk", "Tanggal masuk"), "Tanggal masuk");

        String divisiName = required(row, "divisi", "Divisi");
        Divisi divisi = context.divisiByName().get(key(divisiName));
        if (divisi == null) {
            throw new IllegalArgumentException("Divisi '" + divisiName + "' tidak ditemukan di database.");
        }

        String roleName = required(row, "role", "Role");
        Roles role = context.roleByName().get(key(roleName));
        if (role == null) {
            throw new IllegalArgumentException("Role '" + roleName + "' tidak ditemukan di database.");
        }
        if (FORBIDDEN_ROLE.equalsIgnoreCase(role.getRoleName())) {
            throw new IllegalArgumentException("Role DEV tidak boleh dipakai lewat import.");
        }

        String email = optional(row, "email", 255, "Email");
        if (email != null && !email.contains("@")) {
            throw new IllegalArgumentException("Email '" + email + "' tidak valid.");
        }

        String position = optional(row, "jabatan", 100, "Jabatan");
        String address = optional(row, "alamat", 255, "Alamat");
        String phone = normalizePhone(row.get("no_telepon"), "No telepon");
        String emergencyName = optional(row, "kontak_darurat_nama", 255, "Nama kontak darurat");
        String emergencyPhone = normalizePhone(row.get("kontak_darurat_telepon"), "Telepon kontak darurat");

        EmergencyContactRelationship relation = null;
        String relationName = row.get("kontak_darurat_hubungan");
        if (!relationName.isEmpty()) {
            relation = context.relationByName().get(key(relationName));
            if (relation == null) {
                throw new IllegalArgumentException(
                        "Hubungan kontak darurat '" + relationName + "' tidak ditemukan di database.");
            }
        }

        boolean active = parseStatus(row.get("status"));

        String nik = null;
        if (!row.get("nik").isEmpty()) {
            nik = devNikService.normalize(row.get("nik"));
            devNikService.validateFormat(nik);
            if (seenNiks.contains(nik)) { // [BARU]
                throw new IllegalArgumentException("NIK " + nik + " muncul lebih dari satu kali di file ini.");
            }
            devNikService.validateUnique(nik, null);
        }

        return new EmployeeDraft(username, email, fullName, gender, joinDate, divisi, role, position, address,
                phone, emergencyName, emergencyPhone, relation, active, nik);
    }

    // [UBAH] Dulu bagian bawah createEmployee(). Hanya dipanggil pada import sungguhan, di dalam transaksi baris.
    private void persistEmployee(EmployeeDraft draft, ImportContext context) {
        User user = userRepository.save(User.builder()
                .username(draft.username())
                .password(context.passwordHash())
                .email(draft.email())
                .roleId(draft.role())
                .failedAttempts(0)
                .isActive(draft.active())
                .build());

        Employee employee = employeeRepository.saveAndFlush(Employee.builder()
                .user(user)
                .divisi(draft.divisi())
                .fullName(draft.fullName())
                .address(draft.address())
                .phoneNumber(draft.phone())
                .gender(draft.gender())
                .joinDate(draft.joinDate())
                .position(draft.position())
                .emergencyContactName(draft.emergencyName())
                .emergencyContactPhone(draft.emergencyPhone())
                .emergencyContactRelationship(draft.relation())
                .isActive(draft.active())
                .build());

        // NIK kosong -> sudah dibuat trigger saat INSERT. NIK diisi -> timpa hasil trigger.
        if (draft.nik() != null) {
            devNikService.applyNik(employee.getEmployeeId(), draft.nik());
        }
    }

    // ============================== PEMBANTU ==============================

    private static String key(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String required(CsvRow row, String column, String label) {
        String value = row.get(column);
        if (value.isEmpty()) {
            throw new IllegalArgumentException(label + " wajib diisi.");
        }
        return value;
    }

    private static String optional(CsvRow row, String column, int maxLength, String label) {
        String value = row.get(column);
        return value.isEmpty() ? null : limited(value, maxLength, label);
    }

    private static String limited(String value, int maxLength, String label) {
        if (value.length() > maxLength) {
            throw new IllegalArgumentException(label + " terlalu panjang (maksimal " + maxLength + " karakter).");
        }
        return value;
    }

    private static String parseGender(String value) {
        return switch (key(value)) {
            case "l", "laki-laki", "laki laki", "pria" -> "L";
            case "p", "perempuan", "wanita" -> "P";
            default -> throw new IllegalArgumentException("Jenis kelamin '" + value + "' tidak valid. Isi L atau P.");
        };
    }

    private static boolean parseStatus(String value) {
        return switch (key(value)) {
            case "", "aktif" -> true;
            case "nonaktif", "non aktif", "tidak aktif" -> false;
            default -> throw new IllegalArgumentException("Status '" + value + "' tidak valid. Isi AKTIF atau NONAKTIF.");
        };
    }

    // Excel menghapus angka 0 di depan nomor telepon (0812... -> 812...). Nomor yang tampak
    // seperti itu (diawali 8) dikembalikan ke format 08xx.
    private static String normalizePhone(String raw, String label) {
        String cleaned = raw == null ? "" : raw.replaceAll("[\\s()\\-]", "");
        if (cleaned.isEmpty()) {
            return null;
        }
        if (cleaned.matches("8\\d{7,14}")) {
            cleaned = "0" + cleaned;
        }
        if (!cleaned.matches("\\+?\\d{6,20}")) {
            throw new IllegalArgumentException(label + " '" + raw + "' tidak valid (hanya angka, boleh diawali +).");
        }
        return cleaned;
    }
}
