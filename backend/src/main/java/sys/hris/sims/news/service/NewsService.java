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

    NewsResponse getNewsById(Long id);

    NewsResponse updateNews(Long id, NewsRequest request);

    void deleteNews(Long id);
}