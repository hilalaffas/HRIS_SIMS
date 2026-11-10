package sys.hris.sims.devtools.dto;

// [BARU] Hasil satu baris CSV pada import (alat dev). status: "BERHASIL" atau "DILEWATI".
public record ImportRowResult(int row, String key, String status, String message) {

    public static final String STATUS_SUCCESS = "BERHASIL";
    public static final String STATUS_SKIPPED = "DILEWATI";
    // [BARU] Peringatan pencocokan data: baris tetap diimpor, tetapi total kuota - terpakai - hangus tidak sama
    // dengan sisa di file. TIDAK dihitung sebagai berhasil maupun dilewati (lihat ImportResultResponse.of).
    public static final String STATUS_MISMATCH = "TIDAK_SESUAI";

    public static ImportRowResult success(int row, String key, String message) {
        return new ImportRowResult(row, key, STATUS_SUCCESS, message);
    }

    public static ImportRowResult skipped(int row, String key, String message) {
        return new ImportRowResult(row, key, STATUS_SKIPPED, message);
    }

    public static ImportRowResult mismatch(int row, String key, String message) {
        return new ImportRowResult(row, key, STATUS_MISMATCH, message);
    }
}
