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
//   - [BARU] Aturan hangus HANYA berlaku untuk tanggal hangus mulai FORFEIT_START_DATE (1 Januari 2025)
//     sampai sekarang. Sisa sebelum tanggal itu tidak hangus (masuk Sisa Cuti Lama saat import).
public final class LeaveForfeitCalculator {

    // [BARU] Satu-satunya sumber batas tanggal berlakunya aturan cuti hangus.
    public static final LocalDate FORFEIT_START_DATE = LocalDate.of(2025, 1, 1);

    private LeaveForfeitCalculator() {
    }

    // [BARU] true bila tanggal ini sudah masuk masa berlaku aturan hangus (>= 1 Januari 2025).
    public static boolean isForfeitEligible(LocalDate date) {
        return isForfeitEligible(date, FORFEIT_START_DATE);
    }

    // [BARU] Versi dengan tanggal berlaku yang bisa diatur (tabel leave_rules, lihat LeaveRuleService).
    public static boolean isForfeitEligible(LocalDate date, LocalDate forfeitStart) {
        LocalDate start = forfeitStart == null ? FORFEIT_START_DATE : forfeitStart;
        return date != null && !date.isBefore(start);
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

    // Versi lama: memakai tanggal berlaku bawaan (FORFEIT_START_DATE).
    public static List<Forfeit> calculate(LocalDate joinDate,
                                          BigDecimal baseQuota,
                                          LocalDate today,
                                          LocalDate trackingStart,
                                          List<Usage> usages,
                                          List<StoredForfeit> storedForfeits,
                                          BigDecimal outsideSystemUsed,
                                          LocalDate outsideSystemPeriodStart) {
        return calculate(joinDate, baseQuota, today, trackingStart, usages, storedForfeits,
                outsideSystemUsed, outsideSystemPeriodStart, FORFEIT_START_DATE);
    }

    // [BARU] forfeitStart = tanggal mulai berlakunya hangus (dari LeaveRuleService). Hangus yang tanggalnya
    // sebelum ini tidak dihitung (sisanya masuk Sisa Cuti Lama).
    public static List<Forfeit> calculate(LocalDate joinDate,
                                          BigDecimal baseQuota,
                                          LocalDate today,
                                          LocalDate trackingStart,
                                          List<Usage> usages,
                                          List<StoredForfeit> storedForfeits,
                                          BigDecimal outsideSystemUsed,
                                          LocalDate outsideSystemPeriodStart,
                                          LocalDate forfeitStart) {
        List<Forfeit> result = new ArrayList<>();
        if (joinDate == null || baseQuota == null) {
            return result;
        }

        BigDecimal previousDeficit = BigDecimal.ZERO;
        LocalDate periodStart = joinDate.plusYears(1);
        // [UBAH] Karyawan yang punya riwayat import: angka "terpakai di luar sistem" adalah penyeimbang saldo hasil
        // import (lihat DevLeaveDataService.applyImportBalances), BUKAN pemakaian. Semua pemakaian sudah ada di baris
        // riwayat, jadi angka itu tidak boleh dihitung lagi (dulu dihitung bila periodenya tanpa baris import -> selisih).
        final boolean hasImportedUsage = usages.stream().anyMatch(Usage::imported);

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

                // [UBAH] Angka "terpakai di luar sistem" hanya dihitung bila karyawan BELUM punya riwayat import.
                if (!hasImportedUsage && outsideSystemUsed != null && outsideSystemUsed.signum() > 0
                        && periodStart.equals(outsideSystemPeriodStart)) {
                    used = used.add(outsideSystemUsed);
                }
                endingBalance = baseQuota.add(previousDeficit).subtract(used);
                previousDeficit = endingBalance.min(BigDecimal.ZERO);
            }

            // [UBAH] Hangus yang tanggalnya sebelum FORFEIT_START_DATE tidak dihitung sebagai hangus.
            if (!storedInPeriod.isEmpty()) {
                for (StoredForfeit item : storedInPeriod) {
                    if (isForfeitEligible(item.date(), forfeitStart)) {
                        result.add(new Forfeit(periodStart, periodEnd, item.date(), item.days(), true));
                    }
                }
            } else if (endingBalance != null && endingBalance.signum() > 0 && isForfeitEligible(expiryDate, forfeitStart)) {
                result.add(new Forfeit(periodStart, periodEnd, expiryDate, endingBalance, false));
            }
            periodStart = periodEnd;
        }
        return result;
    }
}
