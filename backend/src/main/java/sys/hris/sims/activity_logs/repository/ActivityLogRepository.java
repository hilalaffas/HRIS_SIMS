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

    // [UBAH] Versi "bersih" untuk tampilan Log Sistem. Yang dikecualikan:
    //  1. action berawalan prefix tertentu (mis. "GET_" = sekadar melihat data)
    //  2. action tertentu yang dicatat oleh aktor tertentu (mis. sync libur
    //     otomatis oleh "System") -- log lama yang sudah terlanjur tersimpan.
    // Ditulis dengan @Query karena Spring Data TIDAK punya keyword "NotStartingWith".
    // SUBSTRING dipakai (bukan LIKE) supaya "_" tidak dianggap wildcard.
    // COALESCE dipakai supaya baris dengan username NULL tidak ikut terbuang.
    @Query("SELECT a FROM ActivityLog a " +
           "WHERE SUBSTRING(a.action, 1, LENGTH(:actionPrefix)) <> :actionPrefix " +
           "AND (COALESCE(a.username, '') <> :hiddenActor OR a.action <> :hiddenAction) " +
           "ORDER BY a.createdAt DESC")
    List<ActivityLog> findVisibleLogs(@Param("actionPrefix") String actionPrefix,
                                      @Param("hiddenActor") String hiddenActor,
                                      @Param("hiddenAction") String hiddenAction);

    @Query("SELECT a FROM ActivityLog a " +
           "WHERE a.userId = :userId " +
           "AND SUBSTRING(a.action, 1, LENGTH(:actionPrefix)) <> :actionPrefix " +
           "AND (COALESCE(a.username, '') <> :hiddenActor OR a.action <> :hiddenAction) " +
           "ORDER BY a.createdAt DESC")
    List<ActivityLog> findVisibleLogsByUserId(@Param("userId") Long userId,
                                              @Param("actionPrefix") String actionPrefix,
                                              @Param("hiddenActor") String hiddenActor,
                                              @Param("hiddenAction") String hiddenAction);

    @Modifying
    @Transactional
    @Query("DELETE FROM ActivityLog a WHERE a.createdAt <= :thresholdDate")
    void deleteLogsOlderThan(@Param("thresholdDate") LocalDateTime thresholdDate);
}