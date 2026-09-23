package sys.hris.sims.news.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.news.dto.NewsRequest;
import sys.hris.sims.news.dto.NewsResponse;
import sys.hris.sims.news.service.NewsService;
import sys.hris.sims.storage.CloudinaryService;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

@RestController
@RequestMapping("/api/news")
@CrossOrigin(origins = "*")
public class NewsController {

    private final NewsService newsService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    public NewsController(NewsService newsService,
                          ActivityLogService activityLogService,
                          UserRepository userRepository,
                          CloudinaryService cloudinaryService) {
        this.newsService = newsService;
        this.activityLogService = activityLogService;
        this.userRepository = userRepository;
        this.cloudinaryService = cloudinaryService;
    }

    private Long getCurrentUserId(Authentication authentication) {
        if (authentication == null) return null;
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    private String getUsername(Authentication authentication) {
        return authentication != null ? authentication.getName() : "System";
    }

    @PostMapping
    public ResponseEntity<NewsResponse> createNews(
            @Valid @RequestBody NewsRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {

        NewsResponse response = newsService.createNews(request, authentication);
        
        activityLogService.log(getUsername(authentication), getCurrentUserId(authentication), 
            "CREATE_NEWS", "news", response.getId(), "Membuat berita baru: " + request.getTitle(), httpRequest);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<NewsResponse>> getAllNews(Authentication authentication, HttpServletRequest httpRequest) {
            
        return ResponseEntity.ok(newsService.getAllNews());
    }

    // [BARU] Listing untuk dashboard manajemen HR/SuperAdmin -- tidak
    // difilter jendela tayang (publishAt/expiresAt), supaya berita yang
    // masih terjadwal atau sudah berakhir tetap kelihatan & bisa
    // diedit/dihapus. Endpoint publik di atas (GET /api/news) tetap
    // terfilter, dipakai widget Dashboard karyawan/manager biasa.
    @GetMapping("/all")
    public ResponseEntity<List<NewsResponse>> getAllNewsForManagement(Authentication authentication, HttpServletRequest httpRequest) {

        return ResponseEntity.ok(newsService.getAllNewsForManagement());
    }

    // [BARU] Upload satu gambar untuk disisipkan ke konten berita (editor
    // rich-text di AnnouncementModal). Dipanggil terpisah dari
    // createNews/updateNews karena gambar perlu di-upload dulu ke Cloudinary
    // sebelum URL-nya disisipkan ke HTML `content` -- pola yang sama dengan
    // alur upload foto profil (lihat ProfileController), hanya beda folder
    // & validasi (lihat CloudinaryService.uploadNewsImage()).
    @PostMapping("/upload-image")
    public ResponseEntity<?> uploadNewsImage(
            @RequestParam("image") MultipartFile image,
            Authentication authentication,
            HttpServletRequest httpRequest) throws java.io.IOException {

        String url = cloudinaryService.uploadNewsImage(image);

        activityLogService.log(getUsername(authentication), getCurrentUserId(authentication),
            "UPLOAD_NEWS_IMAGE", "news", null, "Mengunggah gambar untuk konten berita", httpRequest);

        return ResponseEntity.ok(java.util.Map.of("url", url));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NewsResponse> getNewsById(@PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {
            
        return ResponseEntity.ok(newsService.getNewsById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NewsResponse> updateNews(
            @PathVariable Long id,
            @Valid @RequestBody NewsRequest request,
            Authentication authentication, 
            HttpServletRequest httpRequest) {

        NewsResponse response = newsService.updateNews(id, request);
        
        // Log diubah menggunakan title dari request
        activityLogService.log(getUsername(authentication), getCurrentUserId(authentication), 
            "UPDATE_NEWS", "news", id, "Mengupdate berita: " + request.getTitle(), httpRequest);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNews(@PathVariable Long id, Authentication authentication, HttpServletRequest httpRequest) {

        newsService.deleteNews(id);
        
        activityLogService.log(getUsername(authentication), getCurrentUserId(authentication), 
            "DELETE_NEWS", "news", id, "Menghapus berita id: " + id, httpRequest);

        return ResponseEntity.noContent().build();
    }
}