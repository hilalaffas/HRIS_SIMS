// src/pages/Dashboard/components/CutiSummaryCards.jsx
import React from 'react';
import './CutiSummaryCards.css';
import Skeleton from '../../../components/Skeleton'; // [BARU]

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
export default function CutiSummaryCards({ balance, isLoading = false }) {
  const totalSisa = balance?.totalRemainingLeave ?? 0;

  if (isLoading) {
    return (
      <div className="cuti-summary-grid" aria-label="Memuat ringkasan informasi">
        {["cuti", "kehadiran", "terlambat", "izin"].map((type) => (
          <div className={`cuti-card cuti-card--${type}`} key={type} aria-hidden="true">
            <Skeleton className="skeleton--onDark" width={100} height={10} style={{ marginBottom: 10 }} />
            <Skeleton className="skeleton--onDark" width={64} height={32} />
          </div>
        ))}
      </div>
    );
  }
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

  const cards = [
    { type: 'cuti', label: 'TOTAL SISA CUTI', value: totalSisa, unit: 'Hari', icon: 'fa-calendar', note: catatan },
    { type: 'kehadiran', label: 'TOTAL KEHADIRAN', value: 0, unit: 'Hari', icon: 'fa-user-check', note: 'Periode berjalan' },
    { type: 'terlambat', label: 'TERLAMBAT', value: 0, unit: 'Kali', icon: 'fa-triangle-exclamation', note: 'Periode berjalan' },
    { type: 'izin', label: 'IZIN / CUTI', value: 0, unit: 'Hari', icon: 'fa-file-lines', note: 'Periode berjalan' },
  ];

  return (
    <div className="cuti-summary-grid" aria-label="Ringkasan informasi karyawan">
      {cards.map(({ type, label, value, unit, icon, note }) => (
        <article className={`cuti-card cuti-card--${type}`} key={type}>
          <span className="cuti-card__label">{label}</span>
          <div className="cuti-card__value">
            <span className="cuti-card__number">{value}</span>
            <span className="cuti-card__unit">{unit}</span>
          </div>
          <span className="cuti-card__note">{note}</span>
          <i className={`fa-regular ${icon} cuti-card__icon`} aria-hidden="true"></i>
        </article>
      ))}
    </div>
  );
}
