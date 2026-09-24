package sys.hris.sims.news.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import sys.hris.sims.news.dto.NewsRequest;
import sys.hris.sims.news.dto.NewsResponse;
import sys.hris.sims.news.entity.News;
import sys.hris.sims.news.repository.NewsRepository;

@Service
public class NewsServiceImpl implements NewsService {

    // [BARU] Default masa tayang berita kalau HR tidak mengisi tanggal
    // "Selesai" secara manual di form.
    // [UBAH] 7 hari (sebelumnya 30), sama dengan default di
    // AnnouncementModal.jsx -- berlaku untuk "Kirim Sekarang" maupun berita
    // yang dijadwalkan.
    private static final long DEFAULT_MASA_TAYANG_HARI = 7;

    // [BARU] Zona waktu acuan jadwal tayang. Frontend mengirim jam dinding
    // (tanpa timezone) dari <input type="datetime-local"> yang diisi HR di
    // WIB, jadi "sekarang" untuk perbandingan HARUS jam WIB juga -- bukan jam
    // JVM server yang di Render = UTC. Pola sama dengan LeaveService
    // (LocalDate.now(ZoneId.of("Asia/Jakarta"))).
    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Jakarta");

    // [BARU] Masa tayang minimal (selisih publishAt -> expiresAt).
    private static final Duration MIN_DISPLAY_DURATION = Duration.ofMinutes(1);

    private final NewsRepository newsRepository;

    public NewsServiceImpl(NewsRepository newsRepository) {
        this.newsRepository = newsRepository;
    }

    // [BARU] Mengisi publishAt & expiresAt kalau kosong dari frontend:
    //   - publishAt kosong -> tayang mulai sekarang (setara checkbox
    //     "Kirim Sekarang" dicentang, atau HR memang tidak mengisi jadwal).
    //   - expiresAt kosong -> otomatis publishAt + 7 hari.
    // Dipanggil di createNews() maupun updateNews() supaya perilakunya
    // konsisten di kedua alur.
    //
    // [BARU] Setelah default terisi, masa tayang divalidasi minimal 1 menit
    // (expiresAt >= publishAt + 1 menit). Dilempar sebagai
    // IllegalArgumentException -> GlobalExceptionHandler membalas 400 dengan
    // pesannya, dan frontend menampilkannya sebagai toast.
    private void applyDefaultSchedule(News news, NewsRequest request) {
        // [UBAH] Pakai jam WIB, bukan LocalDateTime.now() (jam JVM).
        LocalDateTime publishAt = request.getPublishAt() != null ? request.getPublishAt() : LocalDateTime.now(APP_ZONE);
        LocalDateTime expiresAt = request.getExpiresAt() != null
                ? request.getExpiresAt()
                : publishAt.plusDays(DEFAULT_MASA_TAYANG_HARI);

        if (expiresAt.isBefore(publishAt.plus(MIN_DISPLAY_DURATION))) {
            throw new IllegalArgumentException(
                    "Masa tayang berita minimal 1 menit. Waktu selesai harus minimal 1 menit setelah waktu dikirim.");
        }

        news.setPublishAt(publishAt);
        news.setExpiresAt(expiresAt);
    }

    @Override
    public NewsResponse createNews(
            NewsRequest request,
            Authentication authentication) {

        News news = new News();

        news.setTitle(request.getTitle());
        news.setContent(request.getContent());
        news.setCategory(request.getCategory());
        news.setPublished(request.getPublished());
        applyDefaultSchedule(news, request);

        news.setCreatedBy(authentication.getName());

        News saved = newsRepository.save(news);

        return mapToResponse(saved);
    }

    @Override
    public List<NewsResponse> getAllNews() {

        // [UBAH] Sebelumnya cuma filter published=true. Sekarang juga
        // memperhitungkan jendela waktu publishAt..expiresAt lewat query
        // findActiveAndPublished() -- berita yang belum waktunya tayang
        // (dijadwalkan) atau sudah lewat expiresAt otomatis tidak muncul di
        // sini tanpa perlu job/scheduler terpisah.
        // [UBAH] Kirim waktu WIB ke query (lihat NewsRepository).
        return newsRepository.findActiveAndPublished(LocalDateTime.now(APP_ZONE))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<NewsResponse> getAllNewsForManagement() {

        // [BARU] Dipakai dashboard HR/SuperAdmin (AnnouncementSection mode
        // admin) supaya berita yang belum tayang / sudah berakhir tetap ada
        // di daftar dan bisa diedit atau dihapus, bukan cuma "hilang".
        return newsRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(news -> Boolean.TRUE.equals(news.getPublished()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public NewsResponse getNewsById(Long id) {

        News news = newsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("News tidak ditemukan"));

        return mapToResponse(news);
    }

    @Override
    public NewsResponse updateNews(Long id, NewsRequest request) {

        News news = newsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("News tidak ditemukan"));

        news.setTitle(request.getTitle());
        news.setContent(request.getContent());
        news.setCategory(request.getCategory());
        news.setPublished(request.getPublished());
        applyDefaultSchedule(news, request);

        News updated = newsRepository.save(news);

        return mapToResponse(updated);
    }

    @Override
    public void deleteNews(Long id) {

        newsRepository.deleteById(id);
    }

    private NewsResponse mapToResponse(News news) {

        NewsResponse response = new NewsResponse();

        response.setId(news.getId());
        response.setTitle(news.getTitle());
        response.setContent(news.getContent());
        response.setCategory(news.getCategory());
        response.setPublished(news.getPublished());
        response.setPublishAt(news.getPublishAt());
        response.setExpiresAt(news.getExpiresAt());

        response.setCreatedBy(news.getCreatedBy());
        response.setCreatedAt(news.getCreatedAt());
        response.setUpdatedAt(news.getUpdatedAt());

        return response;
    }
}
