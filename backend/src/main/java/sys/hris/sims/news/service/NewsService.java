package sys.hris.sims.news.service;

import java.util.List;

import org.springframework.security.core.Authentication;

import sys.hris.sims.news.dto.NewsRequest;
import sys.hris.sims.news.dto.NewsResponse;

public interface NewsService {

    NewsResponse createNews(
            NewsRequest request,
            Authentication authentication);

    List<NewsResponse> getAllNews();

    // [BARU] Untuk dashboard manajemen HR/SuperAdmin -- tidak difilter
    // jendela waktu, supaya berita yang belum tayang (terjadwal) atau sudah
    // berakhir tetap kelihatan & bisa diedit/dihapus. Listing publik
    // (getAllNews()) tetap terfilter jendela waktu.
    List<NewsResponse> getAllNewsForManagement();

    NewsResponse getNewsById(Long id);

    NewsResponse updateNews(Long id, NewsRequest request);

    void deleteNews(Long id);
}