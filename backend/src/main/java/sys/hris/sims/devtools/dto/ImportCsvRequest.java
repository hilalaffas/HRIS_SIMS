package sys.hris.sims.devtools.dto;

// [BARU] Body import CSV. csvText = isi file CSV (dibaca di browser). defaultPassword hanya
// dipakai import karyawan (satu password untuk semua akun baru) dan diabaikan di import cuti.
// [UBAH] + dryRun: true -> Pre-flight Validation (semua aturan diperiksa, TIDAK ada yang disimpan).
// Import sungguhan (dryRun false/null) hanya diterima setelah validasi isi yang sama (lihat ImportValidationRegistry).
public record ImportCsvRequest(String csvText, String defaultPassword, Boolean dryRun) {
}
