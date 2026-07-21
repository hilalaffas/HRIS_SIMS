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

    // Method dari file utama untuk filter approver berdasarkan divisi
    public List<Employee> getApproversByRoleAndDivisi(String role, Long divisiId) {
        if (divisiId == null) {
            throw new RuntimeException("Divisi pemohon belum ditentukan");
        }

        return getApproversByRole(role).stream()
                .filter(employee -> employee.getDivisi() != null)
                .filter(employee -> divisiId.equals(employee.getDivisi().getId()))
                .toList();
    }

    public Employee getKaryawanById(Long id) {
        return karyawanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Karyawan tidak ditemukan"));
    }

    // Method dari file utama untuk mencari berdasarkan username (dipakai endpoint approver)
    public Employee getKaryawanByUsername(String username) {
        return karyawanRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new RuntimeException("Data karyawan pemohon tidak ditemukan"));
    }

    // Method dari file kedua untuk endpoint profil /me
    public Employee getMyProfile(String username) {
        return karyawanRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new RuntimeException("Profil karyawan tidak ditemukan untuk username: " + username));
    }

    // Method save dari file kedua agar semua field bisa tersimpan utuh di endpoint self-service
    public Employee save(Employee employee) {
        return karyawanRepository.save(employee);
    }

    public Employee createKaryawan(Employee karyawan) {
        return karyawanRepository.save(karyawan);
    }

    public Employee updateKaryawan(Long id, Employee karyawanBaru) {
        // [PERBAIKAN BUG] 
        // Mengikuti instruksi perbaikan bug dari file kedua:
        // Karena controller sudah mengirimkan entity yang sudah di-update 
        // secara parsial, kita bisa langsung menyimpannya tanpa harus fetch 
        // ulang dan set manual 6 field saja (yang bikin field lain seperti foto dan divisi hilang).
        karyawanBaru.setEmployeeId(id); // Jaga-jaga pastikan ID konsisten
        return karyawanRepository.save(karyawanBaru);
    }

    public void deleteKaryawan(Long id) {
        Employee karyawan = getKaryawanById(id);
        karyawan.setIsActive(false);
        karyawanRepository.save(karyawan);
    }
}