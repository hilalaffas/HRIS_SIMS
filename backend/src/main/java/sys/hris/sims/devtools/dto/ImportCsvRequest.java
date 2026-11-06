package sys.hris.sims.devtools.dto;

// [BARU] Body import CSV. csvText = isi file CSV (dibaca di browser). defaultPassword hanya
// dipakai import karyawan (satu password untuk semua akun baru) dan diabaikan di import cuti.
public record ImportCsvRequest(String csvText, String defaultPassword) {
}
