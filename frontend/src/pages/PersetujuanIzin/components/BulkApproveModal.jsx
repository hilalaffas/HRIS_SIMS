// src/pages/PersetujuanIzin/components/BulkApproveModal.jsx
//
// [BARU] Konfirmasi "ACC Semua Berlampiran". ACC massal melewati checklist
// verifikasi per surat, jadi wajib dikonfirmasi eksplisit dulu.
import React from 'react';
import { CheckCheck } from 'lucide-react';
import useModalExit from '../../../hooks/useModalExit';
import './BulkApproveModal.css';

function BulkApproveModal({ count, running, onConfirm, onCancel }) {
  const { closing, close } = useModalExit();

  const handleCancel = () => {
    if (!running) close(onCancel);
  };

  return (
    <div
      className={`pzn-modal-overlay${closing ? ' is-closing' : ''}`}
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) handleCancel(); }}
    >
      <div className="pzn-modal" role="alertdialog" aria-modal="true" aria-labelledby="pzn-bulk-title" aria-describedby="pzn-bulk-desc">
        <span className="pzn-modal__icon" aria-hidden="true"><CheckCheck /></span>
        <h2 id="pzn-bulk-title">ACC {count} pengajuan berlampiran?</h2>
        <p id="pzn-bulk-desc">
          Semua pengajuan yang menunggu dan sudah melampirkan surat/bukti akan disetujui sekaligus
          tanpa checklist verifikasi satu per satu. Pengajuan tanpa lampiran tidak ikut disetujui.
        </p>
        <div className="pzn-modal__actions">
          <button type="button" className="pzn-btn pzn-btn--reject pzn-modal__btn" disabled={running} onClick={handleCancel}>
            Batal
          </button>
          <button type="button" className="pzn-btn pzn-btn--approve pzn-modal__btn" disabled={running} onClick={onConfirm}>
            {running ? 'Memproses...' : 'Ya, setujui semua'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkApproveModal;
