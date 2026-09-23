package sys.hris.sims.news.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import sys.hris.sims.news.entity.News;

import java.util.List;

@Repository
public interface NewsRepository extends JpaRepository<News, Long> {

    List<News> findAllByOrderByCreatedAtDesc();

    List<News> findByPublishedTrue();

    List<News> findByCategory(String category);

    // [BARU] Dipakai untuk listing publik/dashboard (GET /api/news) --
    // hanya berita yang published=true DAN sedang berada di jendela waktu
    // publishAt..expiresAt. publishAt/expiresAt NULL dianggap "tidak ada
    // batas" di sisi itu (jaring pengaman untuk data lama/tidak lengkap),
    // walau NewsServiceImpl.createNews() selalu mengisi keduanya sehingga
    // NULL semestinya tidak pernah terjadi untuk berita baru.
    @Query("SELECT n FROM News n WHERE n.published = true " +
            "AND (n.publishAt IS NULL OR n.publishAt <= CURRENT_TIMESTAMP) " +
            "AND (n.expiresAt IS NULL OR n.expiresAt >= CURRENT_TIMESTAMP) " +
            "ORDER BY n.createdAt DESC")
    List<News> findActiveAndPublished();

}