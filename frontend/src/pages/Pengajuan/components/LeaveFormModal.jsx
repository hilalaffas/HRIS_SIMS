// src/pages/Pengajuan/components/LeaveFormModal.jsx
//
// Popup "Pengajuan Cuti Karyawan": membungkus <LeaveForm> yang SAMA dengan yang
// dipakai halaman Cuti lama (kalender, sesi Pagi/Siang, pemilihan approver,
// validasi, popup konfirmasi) -- hanya tampilannya jadi popup.
// Semua state/logika datang dari hook useLeaveApplication lewat `formProps`.
//
// Di atas formulir ada ringkasan SISA CUTI (dari `balance`) supaya pemohon tahu
// jatahnya sebelum mengisi. Daftar pilihan semua dropdown di dalam popup digambar
// lewat portal (DropdownPortalContext) agar tidak terpotong area scroll popup --
// khususnya dropdown "Dicover Oleh" di bagian paling bawah.
//
// Contoh pemakaian:
// <LeaveFormModal formProps={leave.formProps} balance={leave.balance} onClose={() => setOpen(false)} />
import React, { useEffect } from 'react';
import { CalendarCheck, CalendarPlus, X } from 'lucide-react';
import { DropdownPortalContext } from '../../../components/DropdownPortalContext';
import useCountUp from '../../Dashboard/hooks/useCountUp';
import { buildLeaveBalanceNote } from '../../../utils/leaveBalanceNote';
import LeaveForm from '../../Cuti/applycuti/components/LeaveForm';
import useModalExit from '../../../hooks/useModalExit';
import './LeaveFormModal.css';

// Banner sisa cuti: angka naik dengan animasi; skeleton selagi saldo dimuat.
function LeaveBalanceBanner({ balance }) {
  const { total, note, noteFull } = buildLeaveBalanceNote(balance);
  const animatedTotal = useCountUp(Number(total));
  const isLoading = !balance;

  return (
    <div className="pgj-leave-balance" aria-live="polite">
      <span className="pgj-leave-balance__icon"><CalendarCheck aria-hidden="true" /></span>
      <div className="pgj-leave-balance__text">
        <span className="pgj-leave-balance__label">Sisa Cuti Anda</span>
        {isLoading ? (
          <span className="pgj-leave-balance__skeleton" aria-hidden="true" />
        ) : (
          <span className="pgj-leave-balance__note" title={noteFull}>{note}</span>
        )}
      </div>
      <strong className="pgj-leave-balance__value">
        {isLoading ? '...' : animatedTotal.toLocaleString('id-ID')}
        <small>Hari</small>
      </strong>
    </div>
  );
}

export default function LeaveFormModal({ formProps, balance, onClose }) {
  const { closing, close } = useModalExit();
  const { isSubmitting } = formProps;

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Escape ditahan selama pengiriman berjalan supaya tidak menutup di tengah proses.
      if (event.key === 'Escape' && !isSubmitting) close(onClose);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, onClose, isSubmitting]);

  return (
    <div className={`pgj-leave-overlay${closing ? ' is-closing' : ''}`}>
      <section className="pgj-leave-modal" role="dialog" aria-modal="true" aria-labelledby="pgj-leave-title">
        <header className="pgj-leave-header">
          <div className="pgj-leave-heading">
            <span className="pgj-leave-icon"><CalendarPlus aria-hidden="true" /></span>
            <div>
              <h2 id="pgj-leave-title">Pengajuan Cuti Karyawan</h2>
              <p>Permohonan akan diproses secara berjenjang oleh atasan Anda.</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" onClick={() => close(onClose)} disabled={isSubmitting}>
            <X aria-hidden="true" />
          </button>
        </header>

        <LeaveBalanceBanner balance={balance} />

        <DropdownPortalContext.Provider value>
          <div className="pgj-leave-body">
            <LeaveForm {...formProps} hideHeader />
          </div>
        </DropdownPortalContext.Provider>
      </section>
    </div>
  );
}
