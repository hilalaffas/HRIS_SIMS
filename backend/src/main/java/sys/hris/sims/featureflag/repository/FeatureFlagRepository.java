package sys.hris.sims.featureflag.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sys.hris.sims.featureflag.entity.FeatureFlag;

public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, String> {
}
