package sys.hris.sims.leave.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// [BARU] Isi tab "Histori Cuti" (format ledger): satu blok per karyawan, berisi baris pemakaian cuti
// per tanggal -- sama dengan isi file export Excel (DevLeaveHistoryService).
//
//   days     : 0.5 / 1 = cuti yang memotong jatah; 0 = cuti khusus (tipe ada di comment);
//              > 0 dengan forfeited = true = cuti hangus/expired
//   comment  : tipe cuti (null untuk cuti tahunan & setengah hari); "hangus/expired" untuk hangus
public record LeaveLedgerResponse(LocalDate from, LocalDate to, List<Employee> employees) {

    // [UBAH] + summary: pemeriksaan data sejak masuk (null bila karyawan tidak ditemukan di ringkasan).
    public record Employee(Integer nikNumber, String nik, String name, BigDecimal remaining, List<Usage> usages,
                           Summary summary) {
    }

    // [BARU] totalGranted = kuota sejak masuk (kuota dasar x tahun kerja); used / forfeited = sejak masuk
    // (tidak terpengaruh filter periode tabel); expectedRemaining = totalGranted - used - forfeited;
    // difference = sisa di sistem - expectedRemaining; status: OK | TIDAK_SESUAI | BELUM_ADA_RIWAYAT | BELUM_BERHAK
    public record Summary(int fullYears, BigDecimal totalGranted, BigDecimal used, BigDecimal forfeited,
                          BigDecimal expectedRemaining, BigDecimal difference, String status) {
    }

    public record Usage(LocalDate date, BigDecimal days, String comment, boolean forfeited) {
    }
}
