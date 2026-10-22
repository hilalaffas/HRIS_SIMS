package sys.hris.sims.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
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

    // [BARU] Mode penyimpanan file. "cloudinary" (default, dipakai di Render) atau
    // "local" (disimpan ke folder di disk saat development). Diatur lewat
    // application.properties / application-local.properties:
    //   storage.mode=local
    //   storage.local.dir=uploads
    //   storage.local.public-base-url=http://localhost:8080
    // Field non-final sengaja dipakai supaya @RequiredArgsConstructor TIDAK berubah
    // (AuthController, ProfileController, dll. tetap meng-inject class ini seperti semula).
    @Value("${storage.mode:cloudinary}")
    private String storageMode;

    @Value("${storage.local.dir:uploads}")
    private String localDir;

    @Value("${storage.local.public-base-url:http://localhost:8080}")
    private String localPublicBaseUrl;

    private boolean isLocalMode() {
        return storageMode != null && "local".equalsIgnoreCase(storageMode.trim());
    }

    // [BARU] Ekstensi ditentukan dari content-type yang SUDAH lolos validasi di
    // masing-masing validateXxx() (bukan dari nama file kiriman user), supaya foto
    // kamera yang namanya kosong tetap mendapat ekstensi yang benar.
    private String extensionFor(MultipartFile file) {
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            default -> ".bin";
        };
    }

    // [BARU] Simpan file ke disk: {localDir}/{folder}/{publicId}{ext}, lalu kembalikan
    // URL ABSOLUT ({public-base-url}/uploads/{folder}/{file}) supaya semua tempat di
    // frontend yang memakai URL apa adanya (foto absensi, surat dokter, gambar berita,
    // avatar) tetap jalan tanpa perubahan. Folder & nama file sama dengan di Cloudinary.
    // `overwrite=true` (foto profil) menambah ?v=timestamp agar browser tidak memakai
    // cache foto lama karena nama file-nya tetap.
    private String saveLocal(MultipartFile file, String folder, String publicId, boolean overwrite) throws IOException {
        String safeName = publicId.replaceAll("[^a-zA-Z0-9._-]", "_") + extensionFor(file);

        Path baseDir = Paths.get(localDir).toAbsolutePath().normalize();
        Path targetDir = baseDir.resolve(folder).normalize();
        Files.createDirectories(targetDir);

        Path target = targetDir.resolve(safeName).normalize();
        if (!target.startsWith(targetDir)) {
            throw new IllegalArgumentException("Nama file tidak valid.");
        }
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        String base = localPublicBaseUrl == null ? "" : localPublicBaseUrl.trim().replaceAll("/+$", "");
        String url = base + "/uploads/" + folder + "/" + safeName;
        return overwrite ? url + "?v=" + System.currentTimeMillis() : url;
    }

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
        if (isLocalMode()) return saveLocal(file, "employees", publicId, true); // [BARU]

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
        if (isLocalMode()) return saveLocal(file, "news", "news-" + java.util.UUID.randomUUID(), false); // [BARU]

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

    // [BARU] Upload foto selfie bukti kehadiran (modul Absensi). Folder
    // "attendance" terpisah dari "employees" (foto profil) dan "news"
    // (gambar pengumuman). publicId SUDAH unik per pengajuan (dibuat di
    // AttendanceService: "attendance-{employeeId}-{tanggal}-{uuid}") dan
    // TIDAK di-overwrite -- beda dari foto profil, setiap absensi adalah
    // bukti historis sendiri-sendiri, bukan avatar yang boleh ditimpa.
    private static final long MAX_ATTENDANCE_PHOTO_SIZE_BYTES = 3L * 1024L * 1024L; // 3MB
    private static final List<String> ALLOWED_ATTENDANCE_PHOTO_TYPES = List.of("image/jpeg", "image/png", "image/webp");
    private static final List<String> ALLOWED_ATTENDANCE_PHOTO_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".webp");

    private void validateAttendancePhoto(MultipartFile file) {
        if (file.getSize() > MAX_ATTENDANCE_PHOTO_SIZE_BYTES) {
            throw new IllegalArgumentException("Ukuran foto absensi melebihi batas maksimal 3MB.");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String originalFilename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String extension = originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : "";

        // [BARU] Foto hasil jepretan kamera (canvas.toDataURL -> Blob) sering
        // tidak punya nama file asli yang jelas -- kalau ekstensi kosong,
        // cukup andalkan content-type saja (tetap divalidasi, tidak dilewatkan).
        boolean contentTypeOk = ALLOWED_ATTENDANCE_PHOTO_TYPES.contains(contentType);
        boolean extensionOk = extension.isEmpty() || ALLOWED_ATTENDANCE_PHOTO_EXTENSIONS.contains(extension);

        if (!contentTypeOk || !extensionOk) {
            throw new IllegalArgumentException("Tipe file tidak didukung. Hanya JPG, PNG, atau WEBP yang diperbolehkan.");
        }
    }

    // [BARU] Surat dokter / bukti izin sakit (popup "Ajukan Izin / Sakit" dan upload
    // susulan dari tabel riwayat Absensi). Batas 4MB mengikuti
    // spring.servlet.multipart.max-file-size (application.properties) -- naikkan
    // keduanya bersamaan bila ingin 5MB. Berbeda dari foto selfie, PDF juga boleh.
    private static final long MAX_MEDICAL_DOCUMENT_SIZE_BYTES = 4L * 1024L * 1024L; // 4MB
    private static final List<String> ALLOWED_MEDICAL_DOCUMENT_TYPES = List.of("image/jpeg", "image/png", "application/pdf");
    private static final List<String> ALLOWED_MEDICAL_DOCUMENT_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".pdf");

    // Mengembalikan true bila file adalah PDF.
    private boolean validateMedicalDocument(MultipartFile file) {
        if (file.getSize() > MAX_MEDICAL_DOCUMENT_SIZE_BYTES) {
            throw new IllegalArgumentException("Ukuran surat dokter melebihi batas maksimal 4MB.");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String originalFilename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        String extension = originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                : "";

        if (!ALLOWED_MEDICAL_DOCUMENT_TYPES.contains(contentType)
                || !ALLOWED_MEDICAL_DOCUMENT_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Tipe file tidak didukung. Hanya JPG, PNG, atau PDF yang diperbolehkan.");
        }
        return extension.equals(".pdf");
    }

    public String uploadMedicalDocument(MultipartFile file, String publicId) throws IOException {
        boolean isPdf = validateMedicalDocument(file);
        if (isLocalMode()) return saveLocal(file, "medical-documents", publicId, false); // [BARU]

        // PDF diunggah sebagai "raw" (ekstensi .pdf harus ikut di public_id) supaya
        // tautannya bisa dibuka langsung; gambar tetap "image".
        Map uploadResult = cloudinary.uploader().upload(
            file.getBytes(),
            ObjectUtils.asMap(
                "folder", "medical-documents",
                "public_id", isPdf ? publicId + ".pdf" : publicId,
                "overwrite", false,
                "resource_type", isPdf ? "raw" : "image"
            )
        );
        return uploadResult.get("secure_url").toString();
    }

    public String uploadAttendancePhoto(MultipartFile file, String publicId) throws IOException {
        validateAttendancePhoto(file);
        if (isLocalMode()) return saveLocal(file, "attendance", publicId, false); // [BARU]

        Map uploadResult = cloudinary.uploader().upload(
            file.getBytes(),
            ObjectUtils.asMap(
                "folder", "attendance",
                "public_id", publicId,
                "overwrite", false,
                "resource_type", "image"
            )
        );
        return uploadResult.get("secure_url").toString();
    }
}