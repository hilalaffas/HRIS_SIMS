package sys.hris.sims.devtools.dto;

// [BARU] Body import riwayat cuti (format ledger). applyRemaining = true -> angka sisa cuti di
// baris 2 file ikut diterapkan ke saldo karyawan; false/null -> hanya riwayat yang diimpor.
// [UBAH] + dryRun: true -> hanya pratinjau (tidak ada yang disimpan).
public record ImportLeaveHistoryRequest(String csvText, Boolean applyRemaining, Boolean dryRun) {
}
