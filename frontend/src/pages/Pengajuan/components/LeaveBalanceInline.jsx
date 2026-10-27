// src/pages/Pengajuan/components/LeaveBalanceInline.jsx
//
// Informasi sisa cuti versi KECIL (teks satu baris, tanpa card) di atas
// formulir tab Cuti. Angka naik dengan animasi (useCountUp); selagi saldo
// dimuat tampil skeleton. Catatan periode datang dari buildLeaveBalanceNote.
//
// Contoh pemakaian:
// <LeaveBalanceInline balance={leave.balance} />
// [BARU] variant="header": chip transparan untuk diletakkan di header hijau formulir
// <LeaveBalanceInline balance={leave.balance} variant="header" />
import React from 'react';
import { CalendarCheck } from 'lucide-react';
import useCountUp from '../../Dashboard/hooks/useCountUp';
import { buildLeaveBalanceNote } from '../../../utils/leaveBalanceNote';
import './PengajuanTabs.css';

export default function LeaveBalanceInline({ balance, variant = 'inline' }) {
  const { total, note, noteFull } = buildLeaveBalanceNote(balance);
  const animatedTotal = useCountUp(Number(total));
  const isLoading = !balance;

  return (
    <p className={`pgj-balance-inline${variant === 'header' ? ' pgj-balance-inline--header' : ''}`} aria-live="polite">
      <CalendarCheck aria-hidden="true" />
      <span>Sisa cuti Anda:</span>
      {isLoading ? (
        <span className="pgj-balance-inline__skeleton" aria-hidden="true" />
      ) : (
        <>
          <strong>{animatedTotal.toLocaleString('id-ID')} Hari</strong>
          <span className="pgj-balance-inline__note" title={noteFull}>&middot; {note}</span>
        </>
      )}
    </p>
  );
}
