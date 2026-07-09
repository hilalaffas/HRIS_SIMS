package sys.hris.sims.divisi.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import sys.hris.sims.divisi.entity.Divisi;

public interface DivisiRepository extends JpaRepository<Divisi, Long> {
}