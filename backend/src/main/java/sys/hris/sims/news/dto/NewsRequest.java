package sys.hris.sims.news.dto;

import java.time.LocalDateTime;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class NewsRequest {

    private String title;
    private String content;
    private String category;
    private Boolean published;

    // [BARU] Jadwal tayang -- keduanya opsional dari frontend:
    //   publishAt kosong  -> NewsServiceImpl mengisi otomatis dengan waktu
    //                        sekarang (dipakai saat checkbox "Kirim Sekarang"
    //                        dicentang, atau saat update tanpa mengubah jadwal).
    //   expiresAt kosong  -> NewsServiceImpl mengisi otomatis publishAt + 30
    //                        hari (default masa tayang berita).
    private LocalDateTime publishAt;
    private LocalDateTime expiresAt;

}