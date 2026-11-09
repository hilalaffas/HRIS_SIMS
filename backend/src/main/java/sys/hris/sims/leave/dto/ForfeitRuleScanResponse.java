package sys.hris.sims.leave.dto;

import java.time.LocalDate;
import java.util.List;

// [BARU] Hasil pemindaian "tanggal berlaku hangus mana yang paling cocok dengan data". Tiap kandidat
// dihitung ulang untuk SEMUA karyawan; matched = jumlah karyawan yang sisanya persis sama dengan
// total kuota - terpakai - hangus. mismatches = karyawan yang tidak cocok pada aturan yang AKTIF.
public record ForfeitRuleScanResponse(LocalDate currentStartDate,
                                      LocalDate bestStartDate,
                                      LocalDate asOfDate,
                                      int employeesChecked,
                                      int employeesSkipped,
                                      List<Candidate> candidates,
                                      List<LeaveReconciliationRow> mismatches) {

    public record Candidate(LocalDate startDate, int matched, int mismatched, boolean current, boolean best) {
    }
}
