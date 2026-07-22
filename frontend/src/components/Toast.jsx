import React from 'react';
import './Toast.css'; 

// [UBAH] Tambah actionLabel & onAction OPSIONAL untuk sub-link (mis. "Detail")
// di bawah pesan toast. Kalau tidak diisi, tampilannya persis seperti
// sebelumnya (App.jsx & FormKaryawan.jsx tidak perlu diubah sama sekali).
export default function Toast({ message, type = 'success', actionLabel, onAction }) {
  const isSuccess = type === 'success';

  return (
    <div className={`toast-base ${isSuccess ? 'toast-success' : 'toast-error'}`}>
      <div className="toast-row">
        <svg className="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isSuccess ? (
            // Ikon Checkmark untuk Success
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          ) : (
            // Ikon Alert untuk Error
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          )}
        </svg>
        {message}
      </div>

      {/* [BARU] Link "Detail" — cuma render kalau actionLabel & onAction diisi */}
      {actionLabel && onAction && (
        <button type="button" className="toast-action" onClick={onAction}>
          <span className="toast-action-dot" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}