// src/components/SessionExpiredModal.jsx
// [BARU] Ditampilkan App.jsx saat event 'sims:session-expired' diterima
// (dipicu services/api.js ketika backend balas 401 errorCode
// SESSION_EXPIRED). Sengaja dibuat modal blocking dengan SATU tombol "OK"
// (bukan toast yang hilang sendiri) -- user harus sadar & konfirmasi dulu
// sebelum sistem redirect ke /login, sesuai pola UX yang diminta.
import React from 'react';
import './SessionExpiredModal.css';

export default function SessionExpiredModal({ message, onConfirm }) {
  return (
    <div className="session-modal-overlay">
      <div className="session-modal-card">
        <div className="session-modal-body">

          <div className="session-modal-header">
            <div className="session-modal-icon-container">
              {/* Ikon jam/peringatan */}
              <svg className="session-modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v5l3 3" />
              </svg>
            </div>
            <h3 className="session-modal-title">Sesi Berakhir</h3>
          </div>

          <p className="session-modal-text">
            {message || 'Sesi Anda telah berakhir demi keamanan. Silakan login kembali.'}
          </p>

          <div className="session-modal-actions">
            <button type="button" onClick={onConfirm} className="session-modal-btn-ok" autoFocus>
              OK, Login Kembali
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
