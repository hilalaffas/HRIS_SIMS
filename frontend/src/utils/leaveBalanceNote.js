// src/utils/leaveBalanceNote.js
//
// [BARU] Logika catatan di bawah angka "Total Sisa Cuti" -- dipindah dari
// CutiSummaryCards.jsx supaya dipakai bersama oleh CutiSummaryCards
// (halaman Apply Cuti) dan DashboardSummaryCard (Dashboard) tanpa duplikasi.

const formatDate = (isoDate, month) => {
  if (!isoDate) return null;
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric', month, year: 'numeric',
  });
};

export const formatTanggal = (isoDate) => formatDate(isoDate, 'long');
export const formatTanggalSingkat = (isoDate) => formatDate(isoDate, 'short');

/**
 * Mengubah objek balance (GET /api/cuti/balance/me) menjadi:
 *  - total  : angka Total Sisa Cuti (tahunan + manual)
 *  - note   : catatan ringkas (1 baris) untuk ditampilkan
 *  - noteFull : catatan lengkap untuk tooltip (atribut title)
 */
export function buildLeaveBalanceNote(balance) {
  const total = balance?.totalRemainingLeave ?? 0;
  const manualLeave = balance?.remainingManualLeave ?? 0;
  const periodEnd = formatTanggalSingkat(balance?.annualPeriodEnd);
  const eligibleFrom = formatTanggalSingkat(balance?.annualEligibleFrom);

  let note = '-';
  let noteFull = '-';
  if (eligibleFrom) {
    note = `Berlaku mulai ${eligibleFrom}`;
    noteFull = `Cuti tahunan mulai berlaku ${formatTanggal(balance?.annualEligibleFrom)}`;
  } else if (periodEnd) {
    note = `Berlaku s/d ${periodEnd}`;
    noteFull = `Dapat digunakan hingga ${formatTanggal(balance?.annualPeriodEnd)}`;
  }
  if (manualLeave > 0) {
    note += ` • incl. ${manualLeave} hari lama`;
    noteFull += ` (termasuk ${manualLeave} hari cuti lama)`;
  }
  const deficit = Number(balance?.remainingAnnualLeave ?? 0);
  if (deficit < 0) {
    note += ` • Defisit ${Math.abs(deficit)} hari`;
    noteFull += ` • Defisit cuti tahunan ${Math.abs(deficit)} hari akan mengurangi kuota pada reset berikutnya`;
  }

  return { total, note, noteFull };
}
