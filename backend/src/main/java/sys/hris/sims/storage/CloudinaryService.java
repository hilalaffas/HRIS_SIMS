package sys.hris.sims.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryService {

    // [BARU] Batas ukuran & tipe file foto profil. Validasi ukuran di sini
    // sifatnya jaring pengaman kedua -- Spring sudah menolak file > 1MB lebih
    // dulu lewat spring.servlet.multipart.max-file-size (lihat
    // application.properties + GlobalExceptionHandler untuk pesannya).
    // Validasi TIPE file justru baru ada di sini, karena Spring tidak
    // mengecek isi/ekstensi file sama sekali -- tanpa ini, file apapun
    // (mis. .pdf atau .gif) bisa lolos ke Cloudinary selama request-nya
    // multipart dan di bawah batas ukuran.
    private static final long MAX_FOTO_SIZE_BYTES = 1024L * 1024L; // 1MB
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of("image/jpeg", "image/png");
    private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png");

    private final Cloudinary cloudinary;

    // Validasi ukuran & tipe file foto sebelum diunggah ke Cloudinary.
    // Dipanggil dari uploadFoto() -- lempar IllegalArgumentException dengan
    // pesan yang jelas (ditangkap GlobalExceptionHandler / controller lalu
    // diteruskan apa adanya ke frontend, bukan pesan generik).
    private void validateFoto(MultipartFile file) {
        if (file.getSize() > MAX_FOTO_SIZE_BYTES) {
            throw new IllegalArgumentException("Ukuran file foto melebihi batas maksimal 1MB.");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String originalFilename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String extension = originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : "";

        boolean contentTypeOk = ALLOWED_CONTENT_TYPES.contains(contentType);
        boolean extensionOk = ALLOWED_EXTENSIONS.contains(extension);

        if (!contentTypeOk || !extensionOk) {
            throw new IllegalArgumentException("Tipe file tidak didukung. Hanya file JPG atau PNG yang diperbolehkan.");
        }
    }

    // publicId dibuat konsisten (dipakai "user-{userId}") supaya foto lama
    // otomatis tertimpa saat ganti foto -- tidak ada file menumpuk di Cloudinary.
    public String uploadFoto(MultipartFile file, String publicId) throws IOException {
        validateFoto(file);

        Map uploadResult = cloudinary.uploader().upload(
            file.getBytes(),
            ObjectUtils.asMap(
                "folder", "employees",
                "public_id", publicId,
                "overwrite", true,
                "invalidate", true,
                "resource_type", "image"
            )
        );
        return uploadResult.get("secure_url").toString();
    }

    // [BARU] Upload gambar untuk konten "blog" pengumuman/berita
    // (AnnouncementModal, editor rich-text). Sengaja method & validasi
    // terpisah dari uploadFoto():
    //   - folder "news", bukan "employees" -- gambar berita tidak boleh
    //     tercampur dengan foto profil karyawan.
    //   - publicId dibuat unik per gambar (UUID) & TIDAK overwrite, karena
    //     satu post bisa berisi banyak gambar sekaligus (beda dari foto
    //     profil yang cuma satu per user dan memang harus timpa yang lama).
    //   - batas ukuran lebih longgar (3MB) karena ini gambar ilustrasi/
    //     dokumentasi berita, bukan avatar kecil.
    private static final long MAX_NEWS_IMAGE_SIZE_BYTES = 3L * 1024L * 1024L; // 3MB
    private static final List<String> ALLOWED_NEWS_IMAGE_TYPES = List.of("image/jpeg", "image/png", "image/webp");
    private static final List<String> ALLOWED_NEWS_IMAGE_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".webp");

    private void validateNewsImage(MultipartFile file) {
        if (file.getSize() > MAX_NEWS_IMAGE_SIZE_BYTES) {
            throw new IllegalArgumentException("Ukuran gambar melebihi batas maksimal 3MB.");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String originalFilename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String extension = originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : "";

        boolean contentTypeOk = ALLOWED_NEWS_IMAGE_TYPES.contains(contentType);
        boolean extensionOk = ALLOWED_NEWS_IMAGE_EXTENSIONS.contains(extension);

        if (!contentTypeOk || !extensionOk) {
            throw new IllegalArgumentException("Tipe file tidak didukung. Hanya JPG, PNG, atau WEBP yang diperbolehkan.");
        }
    }

    public String uploadNewsImage(MultipartFile file) throws IOException {
        validateNewsImage(file);

        Map uploadResult = cloudinary.uploader().upload(
            file.getBytes(),
            ObjectUtils.asMap(
                "folder", "news",
                "public_id", "news-" + java.util.UUID.randomUUID(),
                "resource_type", "image"
            )
        );
        return uploadResult.get("secure_url").toString();
    }
}