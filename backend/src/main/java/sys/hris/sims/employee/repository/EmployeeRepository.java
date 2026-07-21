package sys.hris.sims.employee.repository;

import org.springframework.data.jpa.repository.JpaRepository;
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
    Optional<Employee> findByUser(User user);
}
