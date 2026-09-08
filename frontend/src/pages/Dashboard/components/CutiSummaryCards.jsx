// src/pages/Dashboard/components/CutiSummaryCards.jsx
import React from 'react';
import './CutiSummaryCards.css';

const formatTanggal = (isoDate) => {
  if (!isoDate) return null;
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

/**
 * Card ringkasan sisa cuti.
 * [UBAH] Sekarang menerima objek `balance` langsung dari response
 * GET /api/cuti/balance/me atau /balance/{employeeId} (lihat CutiService),
 * bukan lagi dua angka terpisah. Angka yang ditampilkan = Sisa Cuti Tahunan
 * + Sisa Cuti (manual), sesuai field totalRemainingLeave dari backend.
 *
 * Contoh pemakaian:
 * <CutiSummaryCards balance={balance} />
 */
export default function CutiSummaryCards({ balance }) {
  const totalSisa = balance?.totalRemainingLeave ?? 0;
  const sisaManual = balance?.remainingManualLeave ?? 0;
  const tanggalRefresh = formatTanggal(balance?.annualPeriodEnd);
  const tanggalMulaiBerhak = formatTanggal(balance?.annualEligibleFrom);

  // [BARU] Catatan tanggal menyesuaikan status karyawan: kalau belum genap
  // 1 tahun kerja, kasih tau kapan cuti tahunannya mulai berlaku. Kalau
  // sudah berhak, kasih tau kapan kuotanya refresh berikutnya.
  let catatan = '-';
  if (tanggalMulaiBerhak) {
    catatan = `Cuti tahunan mulai berlaku ${tanggalMulaiBerhak}`;
  } else if (tanggalRefresh) {
    catatan = `Dapat digunakan hingga ${tanggalRefresh}`;
  }
  if (sisaManual > 0) {
    catatan += ` (termasuk ${sisaManual} hari cuti lama)`;
  }
  if (Number(balance?.remainingAnnualLeave ?? 0) < 0) {
    catatan += ` • Defisit cuti tahunan ${Math.abs(Number(balance.remainingAnnualLeave))} hari akan mengurangi kuota pada reset berikutnya`;
  }

  return (
    <div className="cuti-card cuti-card--dark">
      <span className="cuti-card__label">TOTAL SISA CUTI</span>

      <div className="cuti-card__value">
        <span className="cuti-card__number">{totalSisa}</span>
        <span className="cuti-card__unit">Hari</span>
      </div>

      <span className="cuti-card__note">{catatan}</span>

      {/* Ikon kalender dekoratif */}
      <i className="fa-regular fa-calendar cuti-card__icon" aria-hidden="true"></i>
    </div>
  );
}
