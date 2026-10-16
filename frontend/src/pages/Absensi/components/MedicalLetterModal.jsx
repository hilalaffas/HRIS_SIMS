// src/pages/Absensi/components/MedicalLetterModal.jsx
//
// [BARU] Popup upload surat dokter SUSULAN -- dibuka dari kolom Keterangan /
// Catatan pada baris Sakit di tabel "Jadwal & Log Absensi Bulanan". Memakai
// gaya popup yang sama dengan PermissionRequestModal.
//
// Contoh pemakaian:
// <MedicalLetterModal dateLabel="29 Sep 2026" onSubmit={async (file) => { ... }} onClose={fn} />
import React, { useEffect, useRef, useState } from 'react';
import { FileText, X } from 'lucide-react';
import MedicalDocumentDropzone from './MedicalDocumentDropzone';
import './PermissionRequestModal.css';

export default function MedicalLetterModal({ dateLabel, onSubmit, onClose }) {
  const submitLockRef = useRef(false);
  const [documentFile, setDocumentFile] = useState(null);
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
    if (!documentFile) {
      setErrorMessage('Pilih file surat dokter terlebih dahulu.');
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSubmit(documentFile);
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengunggah surat dokter. Silakan coba lagi.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="abs-permission-backdrop" role="presentation">
      <div
        className="abs-permission-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="abs-letter-title"
      >
        <div className="abs-permission-header">
          <h2 id="abs-letter-title">
            <FileText aria-hidden="true" />
            Upload Surat Dokter Susulan
          </h2>
          <button type="button" aria-label="Tutup" onClick={onClose} disabled={isSubmitting}>
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="abs-permission-body">
          {dateLabel && <p className="abs-permission-hint">Pengajuan izin sakit tanggal {dateLabel}.</p>}
          <MedicalDocumentDropzone
            file={documentFile}
            onChange={setDocumentFile}
            onError={setErrorMessage}
            disabled={isSubmitting}
          />
          <p className="abs-permission-hint">Surat yang sudah dikirim tidak dapat diganti.</p>
          {errorMessage && <p className="abs-permission-error" role="alert">{errorMessage}</p>}
        </div>

        <div className="abs-permission-footer">
          <button type="button" className="abs-permission-cancel" onClick={onClose} disabled={isSubmitting}>
            Batal
          </button>
          <button type="button" className="abs-permission-submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Mengunggah...' : 'Kirim Surat Dokter'}
          </button>
        </div>
      </div>
    </div>
  );
}
