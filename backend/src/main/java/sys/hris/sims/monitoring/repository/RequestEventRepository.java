package sys.hris.sims.monitoring.repository;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import sys.hris.sims.monitoring.entity.RequestEvent;

public interface RequestEventRepository extends JpaRepository<RequestEvent, Long> {

    // Semua parameter selalu terisi (boolean / teks "" / angka) -- bukan NULL -- karena PostgreSQL
    // gagal menebak tipe parameter NULL di klausa "(:x is null or ...)".
    @Query("""
            select e from RequestEvent e
            where (:errorOnly = false or e.status >= 400)
              and (:slowOnly = false or e.durationMs >= :slowThreshold)
              and (:writeOnly = false or e.method in ('POST', 'PUT', 'PATCH', 'DELETE'))
              and (:keyword = ''
                   or lower(coalesce(e.username, '')) like :likeKeyword
                   or lower(e.path) like :likeKeyword
                   or lower(coalesce(e.route, '')) like :likeKeyword
                   or lower(coalesce(e.errorMessage, '')) like :likeKeyword)
            """)
    Page<RequestEvent> search(@Param("errorOnly") boolean errorOnly,
                              @Param("slowOnly") boolean slowOnly,
                              @Param("writeOnly") boolean writeOnly,
                              @Param("slowThreshold") int slowThreshold,
                              @Param("keyword") String keyword,
                              @Param("likeKeyword") String likeKeyword,
                              Pageable pageable);

    @Modifying
    @Query("delete from RequestEvent e where e.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
