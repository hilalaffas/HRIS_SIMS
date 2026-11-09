package sys.hris.sims.leave.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import sys.hris.sims.leave.entity.LeaveRule;

// [BARU] Aturan cuti (V63). Kuncinya rule_key.
@Repository
public interface LeaveRuleRepository extends JpaRepository<LeaveRule, String> {
}
