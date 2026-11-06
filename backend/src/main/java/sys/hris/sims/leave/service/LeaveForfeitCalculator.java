package sys.hris.sims.leave.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

// [BARU] Menghitung sisa cuti tahunan yang HANGUS (kedaluwarsa) di tiap periode anniversary yang
// sudah berakhir. Kelas ini murni Java (tanpa Spring/database) supaya mudah diuji sendiri.
//
// Aturan (sama dengan LeaveService.getLeaveBalance):
//   - Periode pertama dimulai saat karyawan genap 1 tahun; tiap periode berlangsung 1 tahun
//     [mulai, mulai + 1 tahun). Hari terakhir yang masih bisa dipakai = mulai + 1 tahun - 1 hari.
//   - Kuota pembuka = kuota dasar + defisit periode sebelumnya (defisit = saldo akhir negatif).
//   - Saldo akhir = kuota pembuka - pemakaian periode itu.
//   - Saldo akhir POSITIF tidak dibawa ke periode berikutnya -> itulah cuti hangus.
//     Contoh: sisa 5 hari, periode berakhir 2026-10-13 -> hangus 5 hari pada tanggal 2026-10-12.
//   - Periode yang SUDAH punya catatan hangus tersimpan (hasil import) dipakai apa adanya; tidak
//     dibuatkan catatan hangus baru (anti dobel).
//   - Tanpa bukti data pelacakan (trackingStart == null) tidak ada hangus baru yang dibuat, supaya
//     karyawan lama yang riwayatnya belum pernah dimasukkan tidak dianggap hangus 12 hari per tahun.
public final class LeaveForfeitCalculator {

    private LeaveForfeitCalculator() {
    }

    // Satu pemakaian cuti yang memotong jatah. annualDays = porsi yang dibebankan ke cuti tahunan
    // (sisanya dipotong dari Sisa Cuti Lama). imported = hasil import riwayat ledger.
    public record Usage(LocalDate date, BigDecimal totalDays, BigDecimal annualDays, boolean imported) {
    }

    // Catatan hangus yang sudah tersimpan di database (hasil import ledger).
    public record StoredForfeit(LocalDate date, BigDecimal days) {
    }

    // periodStart/periodEnd: [mulai, akhir) periode; expiryDate: hari terakhir periode (tanggal hangus).
    // stored = true bila berasal dari catatan tersimpan, false bila baru dihitung.
    public record Forfeit(LocalDate periodStart, LocalDate periodEnd, LocalDate expiryDate,
                          BigDecimal days, boolean stored) {
    }

    public static List<Forfeit> calculate(LocalDate joinDate,
                                          BigDecimal baseQuota,
                                          LocalDate today,
                                          LocalDate trackingStart,
                                          List<Usage> usages,
                                          List<StoredForfeit> storedForfeits,
                                          BigDecimal outsideSystemUsed,
                                          LocalDate outsideSystemPeriodStart) {
        List<Forfeit> result = new ArrayList<>();
        if (joinDate == null || baseQuota == null) {
            return result;
        }

        BigDecimal previousDeficit = BigDecimal.ZERO;
        LocalDate periodStart = joinDate.plusYears(1);

        // Hanya periode yang SUDAH berakhir (akhir <= hari ini).
        while (!periodStart.plusYears(1).isAfter(today)) {
            LocalDate periodEnd = periodStart.plusYears(1);
            LocalDate expiryDate = periodEnd.minusDays(1);
            final LocalDate start = periodStart;

            List<StoredForfeit> storedInPeriod = storedForfeits.stream()
                    .filter(item -> !item.date().isBefore(start) && item.date().isBefore(periodEnd))
                    .toList();

            boolean tracked = trackingStart != null && periodEnd.isAfter(trackingStart);
            if (!tracked) {
                previousDeficit = BigDecimal.ZERO; // sebelum data pelacakan: mulai dari nol
            }

            BigDecimal endingBalance = null;
            if (tracked) {
                List<Usage> inPeriod = usages.stream()
                        .filter(item -> !item.date().isBefore(start) && item.date().isBefore(periodEnd))
                        .toList();
                BigDecimal used = inPeriod.stream().map(Usage::annualDays).reduce(BigDecimal.ZERO, BigDecimal::add);

                // Angka "terpakai di luar sistem" dihitung hanya bila periode itu belum punya riwayat
                // tanggal hasil import -- kalau sudah ada, hari-harinya sudah tercatat (hindari ganda).
                boolean hasImportedInPeriod = inPeriod.stream().anyMatch(Usage::imported);
                if (!hasImportedInPeriod && outsideSystemUsed != null && outsideSystemUsed.signum() > 0
                        && periodStart.equals(outsideSystemPeriodStart)) {
                    used = used.add(outsideSystemUsed);
                }
                endingBalance = baseQuota.add(previousDeficit).subtract(used);
                previousDeficit = endingBalance.min(BigDecimal.ZERO);
            }

            if (!storedInPeriod.isEmpty()) {
                for (StoredForfeit item : storedInPeriod) {
                    result.add(new Forfeit(periodStart, periodEnd, item.date(), item.days(), true));
                }
            } else if (endingBalance != null && endingBalance.signum() > 0) {
                result.add(new Forfeit(periodStart, periodEnd, expiryDate, endingBalance, false));
            }
            periodStart = periodEnd;
        }
        return result;
    }
}
