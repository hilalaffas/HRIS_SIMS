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

    public Employee getKaryawanByUsername(String username) {
        return karyawanRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new RuntimeException("Data karyawan pemohon tidak ditemukan"));
    }

    public Employee createKaryawan(Employee karyawan) {
        return karyawanRepository.save(karyawan);
    }

    public Employee updateKaryawan(Long id, Employee karyawanBaru) {
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
