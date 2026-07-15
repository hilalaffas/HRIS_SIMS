package sys.hris.sims.news.service;

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

    private final NewsRepository newsRepository;

    public NewsServiceImpl(NewsRepository newsRepository) {
        this.newsRepository = newsRepository;
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

        news.setCreatedBy(authentication.getName());

        News saved = newsRepository.save(news);

        return mapToResponse(saved);
    }

    @Override
    public List<NewsResponse> getAllNews() {

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

        response.setCreatedBy(news.getCreatedBy());
        response.setCreatedAt(news.getCreatedAt());
        response.setUpdatedAt(news.getUpdatedAt());

        return response;
    }
}
