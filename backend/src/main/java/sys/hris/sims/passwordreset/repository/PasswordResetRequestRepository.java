package sys.hris.sims.passwordreset.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import sys.hris.sims.passwordreset.entity.PasswordResetRequest;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {

    List<PasswordResetRequest> findByStatus(String status);

    long countByStatus(String status);

}