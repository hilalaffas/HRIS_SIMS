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

    public record Employee(Integer nikNumber, String nik, String name, BigDecimal remaining, List<Usage> usages) {
    }

    public record Usage(LocalDate date, BigDecimal days, String comment, boolean forfeited) {
    }
}
