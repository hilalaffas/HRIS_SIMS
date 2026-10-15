// src/pages/Absensi/components/EarlyCheckoutModal.jsx
//
// [BARU] Popup "Peringatan Pulang Cepat": muncul saat karyawan menekan
// Absen Keluar sebelum 8 jam kerja. Alasan WAJIB diisi. Hanya tampilan --
// aturannya ada di utils/earlyCheckout.js dan hooks/useEarlyCheckout.js.
// Dirender lewat portal ke <body> supaya tidak terpengaruh transform /
// container-type milik halaman induk (position: fixed tetap relatif ke layar).
//
// Contoh pemakaian:
// <EarlyCheckoutModal onConfirm={(reason) => ...} onCancel={() => ...} />
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { EARLY_REASON_MAX_LENGTH, MIN_WORK_HOURS } from '../utils/earlyCheckout';
import './EarlyCheckoutModal.css';

export default function EarlyCheckoutModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [showError, setShowError] = useState(false);
  const textareaRef = useRef(null);
  const fieldRef = useRef(null);

  // Escape = batal, scroll halaman dikunci, kursor langsung di kolom alasan.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    textareaRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  const handleConfirm = () => {
    const trimmedReason = reason.trim();
    if (trimmedReason) {
      onConfirm(trimmedReason);
      return;
    }
    // Alasan kosong: tampilkan pesan + getar singkat pada kolom (animasi diulang tiap klik).
    setShowError(true);
    const field = fieldRef.current;
    if (field) {
      field.classList.remove('is-shaking');
      void field.offsetWidth; // paksa reflow supaya animasi bisa diputar ulang
      field.classList.add('is-shaking');
    }
    textareaRef.current?.focus();
  };

  const handleChange = (event) => {
    setReason(event.target.value);
    if (showError) setShowError(false);
  };

  return createPortal(
    <div className="earlyOut__backdrop" role="presentation" onClick={onCancel}>
      <div
        className="earlyOut"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="earlyOutTitle"
        aria-describedby="earlyOutText"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="earlyOut__header">
          <AlertTriangle className="earlyOut__icon" size={26} aria-hidden="true" />
          <div>
            <h2 id="earlyOutTitle">Peringatan Pulang Cepat</h2>
            <p>Durasi kerja Anda belum memenuhi {MIN_WORK_HOURS} jam kerja.</p>
          </div>
        </header>

        <div className="earlyOut__body">
          <p id="earlyOutText" className="earlyOut__text">
            Apakah Anda yakin ingin melakukan Check-Out sekarang? Mohon isi alasan kepulangan lebih awal.
          </p>

          <label className="earlyOut__label" htmlFor="earlyOutReason">Alasan Pulang Cepat</label>
          <div ref={fieldRef} className="earlyOut__field">
            <textarea
              id="earlyOutReason"
              ref={textareaRef}
              value={reason}
              onChange={handleChange}
              maxLength={EARLY_REASON_MAX_LENGTH}
              rows={4}
              placeholder="Contoh: Ada keperluan mendesak / sakit / izin atasan..."
              aria-invalid={showError}
              aria-describedby={showError ? 'earlyOutError' : undefined}
            />
          </div>
          {showError && (
            <p id="earlyOutError" className="earlyOut__error" role="alert">
              Alasan pulang cepat wajib diisi.
            </p>
          )}
        </div>

        <footer className="earlyOut__footer">
          <button type="button" className="earlyOut__btn earlyOut__btn--text" onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="earlyOut__btn earlyOut__btn--warning" onClick={handleConfirm}>
            Ya, Check-Out Pulang
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
