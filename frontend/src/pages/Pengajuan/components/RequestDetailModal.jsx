// src/pages/Pengajuan/components/RequestDetailModal.jsx
//
// Popup detail untuk pengajuan lembur / izin sakit / izin terlambat, dengan
// gaya yang sama seperti popup "Informasi Detail Berkas Cuti" (cuti sendiri
// memakai popup FormCuti yang sudah ada). Isinya disiapkan
// buildRequestDetail() di utils/pengajuanItems.js.
//
// Contoh pemakaian:
// <RequestDetailModal detail={detail} onClose={fn} />
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import useModalExit from '../../../hooks/useModalExit';
import './RequestDetailModal.css';

const STEP_STATE_LABEL = {
  done: 'Selesai',
  current: 'Menunggu',
  rejected: 'Ditolak',
  returned: 'Dikembalikan',
  cancelled: 'Dibatalkan',
  upcoming: 'Belum diproses',
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

          {detail.sections.map((section) => (
            <div className="pgj-detail-section" key={section.label}>
              <span className="pgj-detail-label">{section.label}</span>
              <div className="pgj-detail-box">{section.value || '-'}</div>
            </div>
          ))}

          {detail.steps.length > 0 && (
            <div className="pgj-detail-section">
              <span className="pgj-detail-label">Alur Persetujuan</span>
              <ol className="pgj-detail-steps">
                {detail.steps.map((step) => (
                  <li key={step.key} className={`pgj-detail-step pgj-detail-step--${step.state}`}>
                    <span className="pgj-detail-step-name">{step.label}</span>
                    <span className="pgj-detail-step-state">{STEP_STATE_LABEL[step.state]}</span>
                  </li>
                ))}
              </ol>
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
