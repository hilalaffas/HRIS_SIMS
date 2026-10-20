// src/components/LogoutModal.jsx
import React from 'react';
import './LogoutModal.css'; 
import useModalExit from '../hooks/useModalExit'; // [BARU] animasi keluar modal
import { APP_LEAVE_MS, beginAppLeave, endAppLeave } from '../utils/appTransition'; // [BARU] transisi keluar aplikasi

export default function LogoutModal({ onConfirm, onCancel }) {
  // [BARU] Callback parent (onCancel / onConfirm) TIDAK diubah -- hanya
  // dipanggil setelah animasi keluar selesai, jadi alur logout tetap sama.
  const { closing, close } = useModalExit();

  const handleCancel = () => close(onCancel);

  const handleConfirm = () => {
    // Latar aplikasi memudar ke hijau brand (nyambung ke halaman login)
    // selagi modal menutup, baru sesi dibersihkan.
    beginAppLeave();
    close(() => {
      onConfirm();
      endAppLeave();
    }, APP_LEAVE_MS);
  };

  return (
    <div className={`modal-overlay logout-modal-overlay${closing ? ' is-closing' : ''}`}>
      <div className="modal-card">
        <div className="modal-body">
          
          <div className="modal-header">
            <div className="modal-icon-container">
              {/* Icon Tanda Tanya */}
              <svg className="modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
              </svg>
            </div>
            <h3 className="modal-title">Log Out</h3>
          </div>
          
          <p className="modal-text">
            Keluar dari sistem SIMS?
          </p>
          
          <div className="modal-actions">
            <button onClick={handleCancel} className="btn-cancel">
              Batal
            </button>
            <button onClick={handleConfirm} className="btn-confirm">
              Konfirmasi
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}