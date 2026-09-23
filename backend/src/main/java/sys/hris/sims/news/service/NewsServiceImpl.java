package sys.hris.sims.news.service;

import java.time.LocalDateTime;
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
    private static final long DEFAULT_MASA_TAYANG_HARI = 30;

    private final NewsRepository newsRepository;

    public NewsServiceImpl(NewsRepository newsRepository) {
        this.newsRepository = newsRepository;
    }

    // [BARU] Mengisi publishAt & expiresAt kalau kosong dari frontend:
    //   - publishAt kosong -> tayang mulai sekarang (setara checkbox
    //     "Kirim Sekarang" dicentang, atau HR memang tidak mengisi jadwal).
    //   - expiresAt kosong -> otomatis publishAt + 30 hari.
    // Dipanggil di createNews() maupun updateNews() supaya perilakunya
    // konsisten di kedua alur.
    private void applyDefaultSchedule(News news, NewsRequest request) {
        LocalDateTime publishAt = request.getPublishAt() != null ? request.getPublishAt() : LocalDateTime.now();
        LocalDateTime expiresAt = request.getExpiresAt() != null
                ? request.getExpiresAt()
                : publishAt.plusDays(DEFAULT_MASA_TAYANG_HARI);

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
        return newsRepository.findActiveAndPublished()
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
