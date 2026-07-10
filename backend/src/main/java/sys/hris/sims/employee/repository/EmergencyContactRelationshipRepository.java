package sys.hris.sims.employee.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sys.hris.sims.employee.entity.EmergencyContactRelationship;

public interface EmergencyContactRelationshipRepository extends JpaRepository<EmergencyContactRelationship, Integer> {
}