package sys.hris.sims.notification.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import sys.hris.sims.notification.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Urutan (created_at DESC, id DESC) ditentukan lewat Pageable di service.
    Page<Notification> findByUserId(Long userId, Pageable pageable);

    List<Notification> findTop5ByUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(Long userId);

    long countByUserIdAndReadAtIsNull(Long userId);

    @Modifying
    @Query("update Notification n set n.readAt = :now where n.id = :id and n.userId = :userId and n.readAt is null")
    int markRead(@Param("id") Long id, @Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("update Notification n set n.readAt = :now where n.userId = :userId and n.readAt is null")
    int markAllRead(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    // Hanya notifikasi yang SUDAH dibaca yang boleh dihapus pengguna.
    @Modifying
    @Query("delete from Notification n where n.id = :id and n.userId = :userId and n.readAt is not null")
    int deleteIfRead(@Param("id") Long id, @Param("userId") Long userId);

    @Modifying
    @Query("delete from Notification n where n.userId = :userId and n.readAt is not null")
    int deleteAllRead(@Param("userId") Long userId);

    @Modifying
    @Query("delete from Notification n where n.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);

    boolean existsByIdAndUserId(Long id, Long userId);
}
