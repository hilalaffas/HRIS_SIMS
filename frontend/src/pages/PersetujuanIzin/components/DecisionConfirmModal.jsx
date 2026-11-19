// src/pages/PersetujuanIzin/components/DecisionConfirmModal.jsx
//
// [BARU] Konfirmasi sebelum keputusan Setujui / Tolak Sakit & Izin dikirim. Catatan untuk karyawan
// sudah diisi di DecisionPanel (wajib saat Tolak), jadi popup ini hanya meminta kepastian.
import React from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleX } from 'lucide-react';
import useModalExit from '../../../hooks/useModalExit';
import './BulkApproveModal.css'; // gaya dasar .pzn-modal (dipakai bersama)

function DecisionConfirmModal({ status, row, note, isDocumentReview, processing, onConfirm, onCancel }) {
  const { closing, close } = useModalExit();
  const isApprove = status === 'APPROVED';
  const Icon = isApprove ? CircleCheck : CircleX;

  const subject = isDocumentReview ? 'surat dokter' : 'pengajuan';
  const title = isApprove
    ? (isDocumentReview ? 'Validasi surat dokter ini?' : 'Setujui pengajuan ini?')
    : (isDocumentReview ? 'Tolak surat dokter ini?' : 'Tolak pengajuan ini?');
  const description = isApprove
    ? `Anda akan menyetujui ${subject} milik ${row.employeeName}.`
    : `Anda akan menolak ${subject} milik ${row.employeeName}. Catatan Anda akan dikirim ke karyawan.`;

  const handleCancel = () => {
    if (!processing) close(onCancel);
  };

  return createPortal(
    <div
      className={`pzn-modal-overlay${closing ? ' is-closing' : ''}`}
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) handleCancel(); }}
    >
      <div className="pzn-modal" role="alertdialog" aria-modal="true" aria-labelledby="pzn-confirm-title" aria-describedby="pzn-confirm-desc">
        <span className="pzn-modal__icon" aria-hidden="true"><Icon /></span>
        <h2 id="pzn-confirm-title">{title}</h2>
        <p id="pzn-confirm-desc">{description}</p>
        {note && <p className="pzn-modal__note">&ldquo;{note}&rdquo;</p>}
        <div className="pzn-modal__actions">
          <button type="button" className="pzn-btn pzn-btn--reject pzn-modal__btn" disabled={processing} onClick={handleCancel}>
            Batal
          </button>
          <button
            type="button"
            className={`pzn-btn pzn-modal__btn ${isApprove ? 'pzn-btn--approve' : 'pzn-btn--danger'}`}
            disabled={processing}
            onClick={onConfirm}
          >
            {processing ? 'Memproses...' : (isApprove ? 'Ya, setujui' : 'Ya, tolak')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DecisionConfirmModal;
