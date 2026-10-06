// src/pages/Dashboard/components/CutiSummaryCards.jsx
import React from 'react';
import './CutiSummaryCards.css';
import Skeleton from '../../../components/Skeleton'; // [BARU]
import { buildLeaveBalanceNote } from '../../../utils/leaveBalanceNote'; // [BARU] logika catatan dipindah ke util bersama

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

  // [UBAH] Perhitungan total & catatan dipindah ke utils/leaveBalanceNote.js
  const { total: totalSisa, note: catatan, noteFull: catatanLengkap } = buildLeaveBalanceNote(balance);

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
