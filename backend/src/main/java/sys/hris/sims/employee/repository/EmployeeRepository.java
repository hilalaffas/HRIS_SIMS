package sys.hris.sims.employee.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import sys.hris.sims.employee.entity.Employee;
import java.util.List;
import java.util.Optional;
import sys.hris.sims.user.entity.User;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    List<Employee> findByUser_UserId(Long userId);
    Optional<Employee> findFirstByUser_Username(String username);
    List<Employee> findByIsActive(Boolean isActive); 
    List<Employee> findByFullNameContainingIgnoreCase(String nama);
    Optional<Employee> findFirstByUserOrderByEmployeeIdAsc(User user);

    // [BARU] Laporan Absensi (HRD): karyawan AKTIF beserta divisinya, terurut
    // divisi lalu nama. Dua query terpisah (semua divisi / satu divisi) -- bukan
    // satu query dengan ":divisiId is null" karena parameter null bertipe Long
    // sering gagal di PostgreSQL ("could not determine data type").
    @Query("""
            select e from Employee e
            left join fetch e.divisi d
            where e.isActive = true
            order by d.namaDivisi asc, e.fullName asc
            """)
    List<Employee> findActiveForReport();

    @Query("""
            select e from Employee e
            left join fetch e.divisi d
            where e.isActive = true and d.id = :divisiId
            order by e.fullName asc
            """)
    List<Employee> findActiveForReportByDivisi(@Param("divisiId") Long divisiId);
}
