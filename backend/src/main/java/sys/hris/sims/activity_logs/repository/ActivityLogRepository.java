package sys.hris.sims.activity_logs.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import sys.hris.sims.activity_logs.entity.ActivityLog;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;


@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<ActivityLog> findAllByOrderByCreatedAtDesc();

    // [BARU] Sama seperti dua query di atas, tapi mengecualikan action yang
    // berawalan prefix tertentu (dipakai untuk menyembunyikan log "GET_...").
    // Ditulis dengan @Query karena Spring Data TIDAK punya keyword "NotStartingWith".
    // SUBSTRING dipakai (bukan LIKE) supaya karakter "_" tidak dianggap wildcard.
    @Query("SELECT a FROM ActivityLog a " +
           "WHERE SUBSTRING(a.action, 1, LENGTH(:actionPrefix)) <> :actionPrefix " +
           "ORDER BY a.createdAt DESC")
    List<ActivityLog> findAllExcludingActionPrefix(@Param("actionPrefix") String actionPrefix);

    @Query("SELECT a FROM ActivityLog a " +
           "WHERE a.userId = :userId " +
           "AND SUBSTRING(a.action, 1, LENGTH(:actionPrefix)) <> :actionPrefix " +
           "ORDER BY a.createdAt DESC")
    List<ActivityLog> findByUserIdExcludingActionPrefix(@Param("userId") Long userId,
                                                        @Param("actionPrefix") String actionPrefix);

    @Modifying
    @Transactional
    @Query("DELETE FROM ActivityLog a WHERE a.createdAt <= :thresholdDate")
    void deleteLogsOlderThan(@Param("thresholdDate") LocalDateTime thresholdDate);
}