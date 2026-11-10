package sys.hris.sims.devtools.dto;

import java.util.List;

// [BARU] Ringkasan import CSV + hasil per baris (alat dev).
// [UBAH] + notes: catatan tambahan di luar daftar baris (mis. "57 baris bernilai 0 diabaikan").
public record ImportResultResponse(int total, int success, int skipped, List<ImportRowResult> rows, List<String> notes) {

    public static ImportResultResponse of(List<ImportRowResult> rows) {
        return of(rows, List.of());
    }

    public static ImportResultResponse of(List<ImportRowResult> rows, List<String> notes) {
        int success = (int) rows.stream()
                .filter(row -> ImportRowResult.STATUS_SUCCESS.equals(row.status()))
                .count();
        // [UBAH] Baris TIDAK_SESUAI (peringatan pencocokan data) bukan baris data: tidak ikut total/berhasil/dilewati.
        int skipped = (int) rows.stream()
                .filter(row -> !ImportRowResult.STATUS_SUCCESS.equals(row.status())
                        && !ImportRowResult.STATUS_MISMATCH.equals(row.status()))
                .count();
        return new ImportResultResponse(success + skipped, success, skipped, rows, notes);
    }
}
