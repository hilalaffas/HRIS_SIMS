package sys.hris.sims.role.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sys.hris.sims.role.entity.Roles;

@Repository
public interface RoleRepository extends JpaRepository<Roles, Long> {
}