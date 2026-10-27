// src/pages/Pengajuan/components/ApprovalStatusModal.jsx
//
// [BARU] Popup kartu alur persetujuan (kartu bergaris: Diajukan -> Leader -> SPV -> ...).
// Dibuka saat tombol STATUS di tabel riwayat diklik -- berlaku untuk semua tab
// (Cuti, Sakit & Izin, Lembur, Tukar Shift). Isi kartunya disiapkan
// buildCardModelForItem() di utils/pengajuanItems.js; komponen ini hanya pembungkus popup:
// klik latar / tombol silang / tombol Esc menutup popup dengan animasi keluar.
//
// Contoh pemakaian:
// <ApprovalStatusModal model={cardModel} onClose={() => setStatusKey(null)} />
import React, { useCallback, useEffect } from 'react';
import ApprovalStatusCard from '../../../components/ApprovalStatusCard';
import useModalExit from '../../../hooks/useModalExit';
import './ApprovalStatusModal.css';

export default function ApprovalStatusModal({ model, onClose }) {
  const { closing, close } = useModalExit();
  const requestClose = useCallback(() => close(onClose), [close, onClose]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  if (!model) return null;

  return (
    <div className={`pgj-status-overlay${closing ? ' is-closing' : ''}`} onMouseDown={requestClose}>
      <div
        className="pgj-status-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Alur persetujuan pengajuan"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <ApprovalStatusCard model={model} variant="compact" onClose={requestClose} />
      </div>
    </div>
  );
}
