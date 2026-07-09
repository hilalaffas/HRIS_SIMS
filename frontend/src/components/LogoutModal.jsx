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