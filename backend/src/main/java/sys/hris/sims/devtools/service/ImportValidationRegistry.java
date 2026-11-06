package sys.hris.sims.devtools.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

// [BARU] Gerbang "Pre-flight Validation" di sisi server untuk semua import di /devAccess.
//
// Aturan: import sungguhan hanya berjalan bila akun yang sama baru saja menjalankan validasi
// (dryRun) terhadap ISI FILE YANG SAMA dan opsi yang sama. Dengan begitu langkah
// "tinjau ringkasan validasi -> setujui" tidak bisa dilewati hanya dengan memanggil API langsung,
// dan file yang berubah di antara validasi dan import otomatis ditolak.
//
// Cara kerja: sidik jari SHA-256 dari (jenis import + opsi + isi file) disimpan per akun & jenis
// import selama 15 menit; dipakai SEKALI saat import (habis dipakai = harus validasi ulang).
//
// Batasan yang disengaja: penyimpanan ada di memori satu instance server. Bila server restart
// atau dijalankan lebih dari satu instance, pengguna cukup menjalankan validasi ulang. Bila
// nanti dipakai multi-instance, pindahkan map ini ke tabel database atau cache bersama.
@Component
public class ImportValidationRegistry {

    private static final Duration VALIDITY = Duration.ofMinutes(15);

    private record Approval(String digest, Instant expiresAt) {
    }

    private final Map<String, Approval> approvals = new ConcurrentHashMap<>();

    // Sidik jari isi file. options = opsi yang mengubah hasil import (mis. "applyRemaining=true").
    public static String digestOf(String kind, String options, byte[] content) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            sha.update((kind + '\n' + options + '\n').getBytes(StandardCharsets.UTF_8));
            sha.update(content == null ? new byte[0] : content);
            return HexFormat.of().formatHex(sha.digest());
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 tidak tersedia di JVM ini.", ex);
        }
    }

    public static String digestOfText(String kind, String options, String text) {
        byte[] bytes = text == null ? new byte[0] : text.getBytes(StandardCharsets.UTF_8);
        return digestOf(kind, options, bytes);
    }

    // Dipanggil setelah validasi (dryRun) selesai tanpa error fatal.
    public void remember(String username, String kind, String digest) {
        purgeExpired();
        approvals.put(keyOf(username, kind), new Approval(digest, Instant.now().plus(VALIDITY)));
    }

    // Dipanggil tepat sebelum import sungguhan. Melempar IllegalArgumentException (-> HTTP 400 + pesan)
    // bila validasi belum dilakukan, sudah kedaluwarsa, atau isi/opsi file berbeda dari yang divalidasi.
    public void requireValidated(String username, String kind, String digest) {
        Approval approval = approvals.remove(keyOf(username, kind));
        boolean valid = approval != null
                && approval.digest().equals(digest)
                && approval.expiresAt().isAfter(Instant.now());
        if (!valid) {
            throw new IllegalArgumentException(
                    "Pre-flight Validation belum dijalankan untuk isi file ini, sudah kedaluwarsa (15 menit), "
                            + "atau file/opsi berubah setelah divalidasi. Jalankan validasi ulang sebelum import.");
        }
    }

    private void purgeExpired() {
        Instant now = Instant.now();
        approvals.values().removeIf(approval -> approval.expiresAt().isBefore(now));
    }

    private static String keyOf(String username, String kind) {
        return username + '|' + kind;
    }
}
