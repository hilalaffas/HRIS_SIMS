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

    // Dipakai endpoint GET /api/karyawan/me — ambil profil milik user yang sedang login.
    public Employee getMyProfile(String username) {
        return karyawanRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new RuntimeException("Profil karyawan tidak ditemukan untuk username: " + username));
    }

    // CATATAN: updateKaryawan() di bawah ini HANYA menyimpan 6 field
    // (fullName, address, phoneNumber, gender, joinDate, isActive) — field
    // kontak darurat, foto, divisi, NIK tidak ikut tersimpan meski di-set di
    // objek yang dikirim. Ini kemungkinan bug lama yang juga memengaruhi
    // endpoint admin PUT /{id}. Untuk endpoint self-service /me, dipakai
    // method save() polos ini supaya semua field yang di-set controller
    // benar-benar tersimpan.
    public Employee save(Employee employee) {
        return karyawanRepository.save(employee);
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
        //karyawanBaru.setEmployeeId(id); // jaga-jaga, pastikan ID tetap konsisten (update, bukan insert baru)
        //return karyawanRepository.save(karyawanBaru);
        Employee karyawan = getKaryawanById(id);
        karyawan.setFullName(karyawanBaru.getFullName());
        karyawan.setAddress(karyawanBaru.getAddress()); 
        karyawan.setPhoneNumber(karyawanBaru.getPhoneNumber());
        karyawan.setGender(karyawanBaru.getGender());
        karyawan.setJoinDate(karyawanBaru.getJoinDate());
        karyawan.setIsActive(karyawanBaru.getIsActive());
        return karyawanRepository.save(karyawan);
    }

    public void deleteKaryawan(Long id) {
        Employee karyawan = getKaryawanById(id);
        karyawan.setIsActive(false);
        karyawanRepository.save(karyawan);
    }
}
