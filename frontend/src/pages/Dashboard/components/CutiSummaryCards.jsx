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

// [BARU] Versi ringkas (mis. "5 Okt 2027") untuk catatan di card, supaya
// catatan cukup 1-2 baris dan card tidak membesar ke bawah.
const formatTanggalSingkat = (isoDate) => {
  if (!isoDate) return null;
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
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
  // [BARU] Selagi balance belum datang dari backend, tampilkan skeleton
  // dengan bentuk kartu yang sama persis -- sebelumnya kartu ini langsung
  // menampilkan "0 Hari" (angka default saat balance masih null), yang
  // menyesatkan karena terlihat seperti data asli padahal belum tentu 0.
  if (isLoading) {
    return (
      <div className="cuti-card cuti-card--dark cuti-card--compact" aria-hidden="true">
        <Skeleton className="skeleton--onDark" width={110} height={10} style={{ marginBottom: 6 }} />
        <Skeleton className="skeleton--onDark" width={80} height={28} style={{ marginBottom: 6 }} />
        <Skeleton className="skeleton--onDark" width="70%" height={10} />
        <i className="fa-regular fa-calendar cuti-card__icon" aria-hidden="true"></i>
      </div>
    );
  }

  const totalSisa = balance?.totalRemainingLeave ?? 0;
  const sisaManual = balance?.remainingManualLeave ?? 0;
  const tanggalRefresh = formatTanggalSingkat(balance?.annualPeriodEnd);
  const tanggalMulaiBerhak = formatTanggalSingkat(balance?.annualEligibleFrom);

  // [UBAH] Catatan dipersingkat. Sebelumnya kalimat panjang ("Dapat
  // digunakan hingga 5 Oktober 2027 (termasuk 2 hari cuti lama) • Defisit
  // ...") membungkus jadi 3-4 baris sehingga card membesar ke bawah.
  // Teks lengkap tetap tersedia lewat tooltip (atribut title).
  let catatan = '-';
  let catatanLengkap = '-';
  if (tanggalMulaiBerhak) {
    catatan = `Berlaku mulai ${tanggalMulaiBerhak}`;
    catatanLengkap = `Cuti tahunan mulai berlaku ${formatTanggal(balance?.annualEligibleFrom)}`;
  } else if (tanggalRefresh) {
    catatan = `Berlaku s/d ${tanggalRefresh}`;
    catatanLengkap = `Dapat digunakan hingga ${formatTanggal(balance?.annualPeriodEnd)}`;
  }
  if (sisaManual > 0) {
    catatan += ` • incl. ${sisaManual} hari lama`;
    catatanLengkap += ` (termasuk ${sisaManual} hari cuti lama)`;
  }
  const defisit = Number(balance?.remainingAnnualLeave ?? 0);
  if (defisit < 0) {
    catatan += ` • Defisit ${Math.abs(defisit)} hari`;
    catatanLengkap += ` • Defisit cuti tahunan ${Math.abs(defisit)} hari akan mengurangi kuota pada reset berikutnya`;
  }

  return (
    <div className="cuti-card cuti-card--dark cuti-card--compact">
      <span className="cuti-card__label">TOTAL SISA CUTI</span>

      <div className="cuti-card__value">
        <span className="cuti-card__number">{totalSisa}</span>
        <span className="cuti-card__unit">Hari</span>
      </div>

      <span className="cuti-card__note" title={catatanLengkap}>{catatan}</span>

      {/* Ikon kalender dekoratif */}
      <i className="fa-regular fa-calendar cuti-card__icon" aria-hidden="true"></i>
    </div>
  );
}
