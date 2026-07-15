package sys.hris.sims.employee.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.user.repository.UserRepository;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {
    private final EmployeeRepository karyawanRepository;
    private final UserRepository userRepository;

    public List<Employee> getAllKaryawan() {
        return karyawanRepository.findAll();
    }

    public List<Employee> getApproversByRole(String role) {
        return karyawanRepository.findAll().stream()
                .filter(employee -> Boolean.TRUE.equals(employee.getIsActive()))
                .filter(employee -> employee.getUser() != null)
                .filter(employee -> employee.getUser().getRoleId() != null)
                .filter(employee -> employee.getUser().getRoleId().getRoleName() != null)
                .filter(employee -> employee.getUser().getRoleId().getRoleName().equalsIgnoreCase(role))
                .toList();
    }

    public Employee getKaryawanById(Long id) {
        return karyawanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Karyawan tidak ditemukan"));
    }

    public Employee createKaryawan(Employee karyawan) {
        return karyawanRepository.save(karyawan);
    }

    public Employee updateKaryawan(Long id, Employee karyawanBaru) {
        // [PERBAIKAN BUG] Sebelumnya method ini mengambil ULANG data lama dari
        // DB (getKaryawanById) lalu hanya menyalin 6 field (fullName, address,
        // phoneNumber, gender, joinDate, isActive) dari karyawanBaru. Padahal
        // controller sudah membangun `karyawanBaru` sebagai entity LENGKAP hasil
        // partial-update (fullName, nik, divisi, kontak darurat, position, foto,
        // dst). Akibatnya field selain 6 di atas -- termasuk NIK, divisi, kontak
        // darurat, dan foto -- selalu hilang / tidak pernah tersimpan.
        //
        // Perbaikannya: simpan langsung entity yang sudah di-update controller,
        // tidak perlu fetch ulang & copy manual.
        karyawanBaru.setEmployeeId(id); // jaga-jaga, pastikan ID tetap konsisten (update, bukan insert baru)
        return karyawanRepository.save(karyawanBaru);
    }

    public void deleteKaryawan(Long id) {
        Employee karyawan = getKaryawanById(id);
        karyawan.setIsActive(false);
        karyawanRepository.save(karyawan);
    }
}
