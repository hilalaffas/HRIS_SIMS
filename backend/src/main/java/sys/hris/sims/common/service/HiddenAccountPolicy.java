package sys.hris.sims.common.service;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.devtools.service.DevAccessService;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] SATU-SATUNYA tempat yang menentukan akun mana yang "tersembunyi".
//
// Akun tersembunyi:
//   - akun `superadmin` (username) atau role SUPER_ADMIN / SUPERADMIN
//   - akun dev (role DEV, atau username = env DEV_ACCESS_USERNAME)
//
// Aturan (sama persis untuk superadmin & dev):
//   1. DAFTAR & LAPORAN (daftar karyawan, laporan, ringkasan, dropdown, log sistem,
//      permintaan reset password, dll): akun tersembunyi TIDAK PERNAH muncul,
//      untuk siapa pun -- termasuk dirinya sendiri. -> exclude(...) / withoutHidden(...)
//   2. AKSES LANGSUNG (detail by id, ubah, hapus, saldo, reset password, dll):
//      hanya pemilik akun itu sendiri yang boleh. Selain itu hasilnya SAMA PERSIS
//      dengan data yang memang tidak ada ("... tidak ditemukan"), supaya keberadaan
//      akun tidak bisa ditebak lewat pesan error. -> requireVisible(...)
//   3. Akun tersembunyi lain (mis. dev vs superadmin) TIDAK saling melihat.
@Service
@RequiredArgsConstructor
public class HiddenAccountPolicy {

    private static final Set<String> HIDDEN_ROLE_NAMES = Set.of("DEV", "SUPER_ADMIN", "SUPERADMIN");
    private static final Set<String> HIDDEN_USERNAMES = Set.of("superadmin");

    private final DevAccessService devAccessService;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    // Cache singkat: hiddenUsernames() dipanggil per-item (mis. memetakan daftar berita), jangan 1 query per item.
    private static final long USERNAME_CACHE_MILLIS = 15_000L;
    private volatile Set<String> cachedHiddenUsernames = Set.of();
    private volatile long cachedHiddenUsernamesAt = 0L;

    // ---------- identitas ----------

    public boolean isHiddenUsername(String username) {
        if (username == null) {
            return false;
        }
        String normalized = username.trim().toLowerCase(Locale.ROOT);
        return HIDDEN_USERNAMES.contains(normalized) || devAccessService.isDevAccount(username);
    }

    public boolean isHiddenUser(User user) {
        if (user == null) {
            return false;
        }
        if (isHiddenUsername(user.getUsername())) {
            return true;
        }
        String roleName = user.getRoleId() == null ? null : user.getRoleId().getRoleName();
        return roleName != null && HIDDEN_ROLE_NAMES.contains(roleName.trim().toUpperCase(Locale.ROOT));
    }

    public boolean isHiddenEmployee(Employee employee) {
        return employee != null && isHiddenUser(employee.getUser());
    }

    private boolean isSameAccount(User user, String viewerUsername) {
        return user != null && user.getUsername() != null && viewerUsername != null
                && user.getUsername().equalsIgnoreCase(viewerUsername.trim());
    }

    // ---------- akses langsung ----------

    // Boleh dilihat/diubah: akun biasa, atau pemilik akun tersembunyi itu sendiri.
    public boolean canAccess(User target, String viewerUsername) {
        return !isHiddenUser(target) || isSameAccount(target, viewerUsername);
    }

    public boolean canAccess(Employee target, String viewerUsername) {
        return target == null || canAccess(target.getUser(), viewerUsername);
    }

    // Dilempar dengan pesan yang SAMA dengan data yang benar-benar tidak ada.
    public void requireVisible(Employee target, String viewerUsername) {
        if (!canAccess(target, viewerUsername)) {
            throw new RuntimeException("Karyawan tidak ditemukan");
        }
    }

    public void requireVisible(User target, String viewerUsername) {
        if (!canAccess(target, viewerUsername)) {
            throw new RuntimeException("User tidak ditemukan");
        }
    }

    // ---------- daftar ----------

    // Daftar/laporan: akun tersembunyi dibuang SELALU (termasuk milik pemilik akunnya).
    public List<Employee> withoutHidden(List<Employee> employees) {
        return employees.stream().filter(employee -> !isHiddenEmployee(employee)).toList();
    }

    public <T> List<T> exclude(List<T> items, Function<T, Employee> employeeOf) {
        return items.stream().filter(item -> !isHiddenEmployee(employeeOf.apply(item))).toList();
    }

    // Daftar milik orang banyak, tapi pemilik akun tersembunyi tetap melihat baris MILIKNYA SENDIRI
    // (mis. riwayat absensi/approval yang memang terkait dirinya).
    public <T> List<T> visibleTo(String viewerUsername, List<T> items, Function<T, Employee> employeeOf) {
        return items.stream().filter(item -> canAccess(employeeOf.apply(item), viewerUsername)).toList();
    }

    // Daftar username yang dianggap tersembunyi (huruf kecil): "superadmin" + akun dev dari environment.
    private Set<String> hiddenUsernameSeeds() {
        Set<String> seeds = new HashSet<>(HIDDEN_USERNAMES);
        String dev = devAccessService.devUsername();
        if (dev != null && !dev.isBlank()) {
            seeds.add(dev.trim().toLowerCase(Locale.ROOT));
        }
        return seeds;
    }

    // Username semua akun tersembunyi (huruf kecil) -- untuk menyaring log & data berbasis username.
    public Set<String> hiddenUsernames() {
        long now = System.currentTimeMillis();
        if (cachedHiddenUsernamesAt != 0L && now - cachedHiddenUsernamesAt < USERNAME_CACHE_MILLIS) {
            return cachedHiddenUsernames;
        }
        Set<String> result = new HashSet<>();
        for (String username : userRepository.findHiddenUsernames(HIDDEN_ROLE_NAMES, hiddenUsernameSeeds())) {
            if (username != null) {
                result.add(username.trim().toLowerCase(Locale.ROOT));
            }
        }
        cachedHiddenUsernames = Set.copyOf(result);
        cachedHiddenUsernamesAt = now;
        return cachedHiddenUsernames;
    }

    // Untuk nama pembuat/penulis yang tampil di data publik (mis. berita): kembalikan null bila akun tersembunyi.
    public String maskActorName(String username) {
        if (username == null) {
            return null;
        }
        return hiddenUsernames().contains(username.trim().toLowerCase(Locale.ROOT)) ? null : username;
    }

    // ID karyawan akun tersembunyi yang HARUS disembunyikan dari `viewerUsername`
    // (milik pemanggil sendiri tidak ikut, supaya ia tetap melihat datanya sendiri).
    public Set<Long> hiddenEmployeeIdsFor(String viewerUsername) {
        Set<Long> ids = new HashSet<>();
        for (Employee employee : employeeRepository.findHiddenEmployees(HIDDEN_ROLE_NAMES, hiddenUsernameSeeds())) {
            if (employee.getEmployeeId() != null && !isSameAccount(employee.getUser(), viewerUsername)) {
                ids.add(employee.getEmployeeId());
            }
        }
        return ids;
    }

    // Untuk DTO yang hanya membawa employeeId (absensi, lembur, koreksi, jadwal).
    public <T> List<T> excludeHiddenById(String viewerUsername, List<T> items, Function<T, Long> employeeIdOf) {
        if (items.isEmpty()) {
            return items;
        }
        Set<Long> hidden = hiddenEmployeeIdsFor(viewerUsername);
        if (hidden.isEmpty()) {
            return items;
        }
        return items.stream().filter(item -> !hidden.contains(employeeIdOf.apply(item))).toList();
    }
}
