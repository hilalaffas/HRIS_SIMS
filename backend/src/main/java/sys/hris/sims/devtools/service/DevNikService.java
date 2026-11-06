package sys.hris.sims.devtools.service;

import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;

// [BARU] Edit NIK manual untuk alat dev (/devAccess) dan import karyawan.
//
// Kenapa pakai query native: Employee.nikKaryawan ditandai insertable/updatable = false
// (NIK dibuat trigger database, lihat V30), jadi JPA tidak pernah menulisnya.
//
// Dampak ke sistem lain (sudah dicek):
//   - Tidak ada foreign key ke NIK; cuti/absensi/lembur memakai employee_id.
//   - NIK hanya tampil di profil, laporan absensi, dan ekspor.
//   - [UBAH] Format NIK sekarang HANYA angka urut murni (0001, 0002, ..., 0212, 2323) --
//     tanpa awalan SYS- dan tanpa tahun (lihat V58). Trigger database membentuknya dari
//     nik_urut (sequence). Supaya NIK manual tidak bentrok dengan NIK karyawan baru nanti,
//     sequence ikut dinaikkan melewati angka NIK manual (hanya naik, tidak pernah turun).
@Service
@RequiredArgsConstructor
public class DevNikService {

    // [UBAH] dulu ^SYS-\\d{4}-\\d{4}$. Sekarang 4-6 digit angka murni (minimal 4 digit, diawali 0).
    private static final Pattern NIK_PATTERN = Pattern.compile("^\\d{4,6}$");

    private final EmployeeRepository employeeRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public String normalize(String rawNik) {
        return rawNik == null ? "" : rawNik.trim().toUpperCase(Locale.ROOT);
    }

    public void validateFormat(String normalizedNik) {
        if (!NIK_PATTERN.matcher(normalizedNik).matches()) {
            throw new IllegalArgumentException(
                    "Format NIK tidak valid. Gunakan angka urut 4-6 digit (contoh 0012 atau 0212).");
        }
    }

    // employeeId null = karyawan belum dibuat (dipakai saat validasi sebelum import).
    public void validateUnique(String normalizedNik, Long employeeId) {
        boolean taken = employeeId == null
                ? employeeRepository.existsByNikKaryawan(normalizedNik)
                : employeeRepository.existsByNikKaryawanAndEmployeeIdNot(normalizedNik, employeeId);
        if (taken) {
            throw new IllegalArgumentException("NIK " + normalizedNik + " sudah dipakai karyawan lain.");
        }
    }

    @Transactional
    public void applyNik(Long employeeId, String rawNik) {
        String nik = normalize(rawNik);
        validateFormat(nik);
        validateUnique(nik, employeeId);

        // [UBAH] NIK sudah angka murni, jadi langsung dipakai sebagai nomor urut.
        long sequenceNumber = Long.parseLong(nik);

        entityManager.flush();

        int updated = entityManager
                .createNativeQuery("UPDATE employees SET nik_karyawan = :nik, nik_urut = :urut WHERE employee_id = :id")
                .setParameter("nik", nik)
                .setParameter("urut", sequenceNumber)
                .setParameter("id", employeeId)
                .executeUpdate();
        if (updated != 1) {
            throw new IllegalArgumentException("Karyawan tidak ditemukan.");
        }

        // Naikkan sequence hanya bila angka urut NIK manual sudah menyamai / melewatinya.
        entityManager
                .createNativeQuery("SELECT setval('nik_karyawan_seq', CAST(:urut AS bigint)) "
                        + "WHERE CAST(:urut AS bigint) >= (SELECT last_value FROM nik_karyawan_seq)")
                .setParameter("urut", sequenceNumber)
                .getResultList();

        // Entity yang sudah termuat masih menyimpan NIK lama -- muat ulang dari database.
        Employee employee = entityManager.find(Employee.class, employeeId);
        if (employee != null) {
            entityManager.refresh(employee);
        }
    }
}
