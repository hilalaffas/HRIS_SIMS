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
import EarlyCheckoutRequest from './EarlyCheckoutRequest';
import './EarlyCheckoutModal.css';

export default function EarlyCheckoutModal({ onConfirm, onCancel, requiredWorkHours = MIN_WORK_HOURS }) {
  const [category, setCategory] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [showError, setShowError] = useState(false);
  const textareaRef = useRef(null);
  const fieldRef = useRef(null);

  // Escape = batal, scroll halaman dikunci, kursor langsung di kolom alasan.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !requestOpen) onCancel();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    textareaRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel, requestOpen]);

  const handleConfirm = () => {
    if (!category) { setShowError(true); return; }
    if (category !== 'OTHER') { setRequestOpen(true); return; }
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

  if (requestOpen) return <EarlyCheckoutRequest category={category} onCancel={() => setRequestOpen(false)} onSubmitted={onConfirm} />;

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
            <p>Durasi kerja Anda belum memenuhi {requiredWorkHours} jam kerja sesuai jadwal.</p>
          </div>
        </header>

        <div className="earlyOut__body">
          <p id="earlyOutText" className="earlyOut__text">
            Apakah Anda yakin ingin melakukan Check-Out sekarang? Mohon isi alasan kepulangan lebih awal.
          </p>

          <label className="earlyOut__label" htmlFor="earlyOutCategory">Jenis Pulang Cepat</label>
          <select id="earlyOutCategory" className="earlyOut__select" value={category} onChange={(event) => { setCategory(event.target.value); setShowError(false); }}>
            <option value="">Pilih alasan pulang cepat</option>
            <option value="URGENT">Pulang Cepat – Cuti Urgent</option>
            <option value="SAKIT">Pulang Cepat – Izin Sakit</option>
            <option value="OTHER">Lainnya</option>
          </select>
          {category && category !== 'OTHER' && <p>Isi dan kirim pengajuan terlebih dahulu. Setelah berhasil, Anda dapat melanjutkan absen keluar.</p>}
          {category === 'OTHER' && <>
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
          </>}
          {showError && (
            <p id="earlyOutError" className="earlyOut__error" role="alert">
              {category ? 'Alasan pulang cepat wajib diisi.' : 'Pilih jenis pulang cepat terlebih dahulu.'}
            </p>
          )}
        </div>

        <footer className="earlyOut__footer">
          <button type="button" className="earlyOut__btn earlyOut__btn--text" onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="earlyOut__btn earlyOut__btn--warning" onClick={handleConfirm}>
            {category && category !== 'OTHER' ? 'Isi Form Pengajuan' : 'Ya, Check-Out Pulang'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
