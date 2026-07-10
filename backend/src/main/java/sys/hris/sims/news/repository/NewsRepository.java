package sys.hris.sims.news.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sys.hris.sims.news.entity.News;

import java.util.List;

@Repository
public interface NewsRepository extends JpaRepository<News, Long> {

    List<News> findAllByOrderByCreatedAtDesc();

    List<News> findByPublishedTrue();

    List<News> findByCategory(String category);

}