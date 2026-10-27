// src/pages/Absensi/components/CorrectionRequestModal.jsx
//
// [BARU] Popup "Ajukan Koreksi" keterlambatan -- dibuka dari link di kolom
// Keterangan / Catatan pada baris Terlambat. Memakai gaya popup yang sama dengan
// PermissionRequestModal / MedicalLetterModal.
//
// Contoh pemakaian:
// <CorrectionRequestModal dateLabel="20 Okt 2026" lateLabel="45 Mnt"
//   onSubmit={async (reason) => { ... }} onClose={fn} />
import React, { useEffect, useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import './PermissionRequestModal.css';

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 300;

export default function CorrectionRequestModal({ dateLabel, lateLabel, onSubmit, onClose }) {
  const submitLockRef = useRef(false);
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitLockRef.current) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < MIN_REASON_LENGTH) {
      setErrorMessage(`Alasan koreksi minimal ${MIN_REASON_LENGTH} karakter.`);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSubmit(trimmedReason);
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengirim pengajuan koreksi. Silakan coba lagi.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="abs-permission-backdrop" role="presentation">
      <div className="abs-permission-modal" role="dialog" aria-modal="true" aria-labelledby="abs-correction-title">
        <div className="abs-permission-header">
          <h2 id="abs-correction-title">
            <Pencil aria-hidden="true" />
            Ajukan Koreksi Absensi
          </h2>
          <button type="button" aria-label="Tutup" onClick={onClose} disabled={isSubmitting}>
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="abs-permission-body">
          <p className="abs-permission-hint">
            Absensi tanggal {dateLabel} tercatat terlambat{lateLabel ? ` (${lateLabel})` : ''}. Jelaskan alasan agar HRD dapat meninjau.
          </p>
          <div className="abs-permission-field">
            <label className="abs-permission-label" htmlFor="abs-correction-reason">Alasan koreksi</label>
            <textarea
              id="abs-correction-reason"
              value={reason}
              maxLength={MAX_REASON_LENGTH}
              rows={4}
              placeholder="Contoh: Jalan raya tertutup banjir sehingga perjalanan tertunda."
              onChange={(event) => setReason(event.target.value)}
              disabled={isSubmitting}
            />
            <p className="abs-permission-hint">{reason.length}/{MAX_REASON_LENGTH} karakter</p>
          </div>
          {errorMessage && <p className="abs-permission-error" role="alert">{errorMessage}</p>}
        </div>

        <div className="abs-permission-footer">
          <button type="button" className="abs-permission-cancel" onClick={onClose} disabled={isSubmitting}>
            Batal
          </button>
          <button type="button" className="abs-permission-submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </div>
    </div>
  );
}
