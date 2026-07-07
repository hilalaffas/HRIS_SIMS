// src/components/LogoutModal.jsx
import React from 'react';
import './LogoutModal.css'; 

export default function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-body">
          
          <div className="modal-header">
            <div className="modal-icon-container">
              <svg className="modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="modal-title">Keluar Sistem</h3>
          </div>
          
          <p className="modal-text">
            Apakah Anda yakin ingin keluar dari aplikasi SIMS?
          </p>
          
          <div className="modal-actions">
            <button onClick={onCancel} className="btn-cancel">
              Batal
            </button>
            <button onClick={onConfirm} className="btn-confirm">
              Konfirmasi
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}