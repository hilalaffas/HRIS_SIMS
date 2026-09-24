package sys.hris.sims.news.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import sys.hris.sims.news.entity.News;

import java.time.LocalDateTime;
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
    //
    // [UBAH] Sebelumnya membandingkan dengan CURRENT_TIMESTAMP (jam server
    // database/JVM, di Render = UTC), padahal publishAt/expiresAt berisi jam
    // dinding WIB yang dipilih HR di form -- selisih 7 jam membuat berita
    // tidak berhenti tayang tepat waktu (dan yang dijadwalkan "sekarang"
    // bisa tertahan). Sekarang waktu pembanding dikirim dari service (WIB)
    // lewat parameter :now. Batas akhir juga diubah dari >= menjadi > supaya
    // berita hilang tepat di detik expiresAt, bukan sesudahnya.
    @Query("SELECT n FROM News n WHERE n.published = true " +
            "AND (n.publishAt IS NULL OR n.publishAt <= :now) " +
            "AND (n.expiresAt IS NULL OR n.expiresAt > :now) " +
            "ORDER BY n.createdAt DESC")
    List<News> findActiveAndPublished(@Param("now") LocalDateTime now);

}