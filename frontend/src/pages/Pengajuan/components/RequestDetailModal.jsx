// src/pages/Pengajuan/components/RequestDetailModal.jsx
//
// Popup detail untuk pengajuan lembur / izin sakit / izin terlambat, dengan
// gaya yang sama seperti popup "Informasi Detail Berkas Cuti" (cuti sendiri
// memakai popup FormCuti yang sudah ada). Isinya disiapkan
// buildRequestDetail() di utils/pengajuanItems.js.
//
// [UBAH] Compact (lebih sedikit scroll) dan alur persetujuan memakai <ApprovalProgressStepper>
// yang sama dengan popup detail cuti.
//
// Contoh pemakaian:
// <RequestDetailModal detail={detail} onClose={fn} />
import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import ApprovalProgressStepper from '../../../components/ApprovalProgressStepper';
import useModalExit from '../../../hooks/useModalExit';
import './RequestDetailModal.css';

// Keterangan di bawah tiap tahap pada stepper
const STEP_CAPTION = {
  done: 'Selesai',
  current: 'Sedang diproses',
  rejected: 'Ditolak',
  returned: 'Dikembalikan',
  cancelled: 'Dibatalkan',
  upcoming: 'Menunggu giliran',
};

export default function RequestDetailModal({ detail, onClose }) {
  const { closing, close } = useModalExit();
  const requestClose = () => close(onClose);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close(onClose);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, onClose]);

  // Langkah "Diajukan" selalu selesai, jadi dilewati: stepper hanya menampilkan tahap persetujuan.
  const progressSteps = useMemo(
    () => (detail?.steps || [])
      .filter((step) => step.key !== 'submitted')
      .map((step) => ({ key: step.key, label: step.label, caption: STEP_CAPTION[step.state], state: step.state })),
    [detail],
  );

  if (!detail) return null;

  return (
    <div className={`pgj-detail-overlay${closing ? ' is-closing' : ''}`} onMouseDown={requestClose}>
      <section
        className="pgj-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pgj-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="pgj-detail-header">
          <div>
            <h2 id="pgj-detail-title">{detail.title}</h2>
            <p>{detail.subtitle}</p>
          </div>
          <button type="button" aria-label="Tutup detail" onClick={requestClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="pgj-detail-body">
          <div className="pgj-detail-grid">
            {detail.fields.map((field) => (
              <div className="pgj-detail-field" key={field.label}>
                <span className="pgj-detail-label">{field.label}</span>
                {field.href ? (
                  <a className="pgj-detail-value pgj-detail-link" href={field.href} target="_blank" rel="noreferrer">
                    {field.value}
                  </a>
                ) : (
                  <span className={`pgj-detail-value${field.accent ? ' is-accent' : ''}`}>{field.value || '-'}</span>
                )}
              </div>
            ))}
            <div className="pgj-detail-field">
              <span className="pgj-detail-label">Status Sekarang</span>
              <span className={`pgj-detail-status pgj-detail-status--${detail.statusTone}`}>{detail.statusLabel}</span>
            </div>
          </div>

          {progressSteps.length > 0 && <ApprovalProgressStepper steps={progressSteps} />}

          {detail.sections.length > 0 && (
            <div className="pgj-detail-sections">
              {detail.sections.map((section) => (
                <div className="pgj-detail-section" key={section.label}>
                  <span className="pgj-detail-label">{section.label}</span>
                  <div className="pgj-detail-box">{section.value || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="pgj-detail-footer">
          <button type="button" onClick={requestClose}>Tutup Detail</button>
        </footer>
      </section>
    </div>
  );
}
