package sys.hris.sims.holiday.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sys.hris.sims.holiday.entity.Holiday;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    List<Holiday> findByDateBetweenOrderByDateAsc(LocalDate start, LocalDate end);
    List<Holiday> findByIsNationalOrderByDateAsc(Boolean isNational);
    Optional<Holiday> findByDate(LocalDate date);
    boolean existsByDate(LocalDate date);

    // [BARU] Dipakai scheduler: apakah suatu tahun sudah punya minimal satu libur nasional.
    boolean existsByIsNationalAndDateBetween(Boolean isNational, LocalDate start, LocalDate end);
}