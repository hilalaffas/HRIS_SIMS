// src/pages/Absensi/components/PermissionRequestModal.jsx
//
// [BARU] Popup "Pengajuan Izin / Surat Sakit" (dibuka tombol "Ajukan Izin / Sakit").
// Menggantikan alur Sakit lama yang memakai kamera + GPS (AttendanceCameraModal).
//
//  - Izin Sakit      : lama izin (HARI KALENDER, termasuk akhir pekan/libur) +
//                      keterangan + surat dokter. Surat boleh MENYUSUL -- tetap
//                      wajib, diunggah belakangan lewat kolom "Keterangan / Catatan"
//                      di tabel riwayat. Selama surat menyusul, lama izin dikunci 1 hari.
//  - Izin Terlambat  : cukup keterangan.
//
// Komponen ini mengelola form-nya sendiri; pengiriman ke backend dilakukan
// parent lewat `onSubmit` (harus melempar error bila gagal supaya pesannya
// tampil di popup).
//
// Contoh pemakaian:
// <PermissionRequestModal onSubmit={async (payload) => { ... }} onClose={fn} />
import React, { useEffect, useRef, useState } from 'react';
import { FilePenLine, X } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import useSickDates from '../../../hooks/useSickDates';
import SickDateFields from './SickDateFields';
import MedicalDocumentDropzone from './MedicalDocumentDropzone';
import './PermissionRequestModal.css';

// [UBAH] Label dropdown dipersingkat: "Sakit" dan "Terlambat" (nilai value tetap SAKIT / TERLAMBAT)
const TYPE_OPTIONS = [
  { value: 'SAKIT', label: 'Sakit' },
  { value: 'TERLAMBAT', label: 'Terlambat' },
];
const NOTE_MAX_LENGTH = 255; // attendances.note VARCHAR(255)

export default function PermissionRequestModal({ onSubmit, onClose, earlyCheckout = false }) {
  const submitLockRef = useRef(false); // gerbang sinkron anti double-submit
  const [type, setType] = useState('SAKIT');
  const dates = useSickDates({ earlyCheckout });
  const { days } = dates;
  const [note, setNote] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [documentLater, setDocumentLater] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSick = type === 'SAKIT';

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitLockRef.current) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTypeChange = (event) => {
    setType(event.target.value);
    setErrorMessage('');
  };

  const handleDocumentLaterChange = (event) => {
    setDocumentLater(event.target.checked);
    if (event.target.checked) {
      setDocumentFile(null);
      dates.lockToday(); // [BARU] surat menyusul -> lama izin dikunci 1 hari
    }
    setErrorMessage('');
  };

  const validate = () => {
    if (!note.trim()) return 'Keterangan wajib diisi.';
    if (isSick) {
      const dateError = dates.validateDates();
      if (dateError) return dateError;
      if (!documentFile && !documentLater) {
        return 'Unggah surat dokter, atau centang "Surat dokter menyusul".';
      }
    }
    return '';
  };

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSubmit({
        type,
        note: note.trim(),
        days: documentLater && !earlyCheckout ? 1 : Number(days),
        startDate: isSick ? dates.startDate : null,
        endDate: isSick ? dates.endDate : null,
        documentLater,
        documentFile: isSick ? documentFile : null,
      });
    } catch (error) {
      // Popup tetap terbuka supaya pesan backend terbaca & isian tidak hilang.
      setErrorMessage(error?.message || 'Gagal mengirim pengajuan. Silakan coba lagi.');
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
        aria-labelledby="abs-permission-title"
      >
        <div className="abs-permission-header">
          <h2 id="abs-permission-title">
            <FilePenLine aria-hidden="true" />
            Pengajuan Izin / Surat Sakit
          </h2>
          <button type="button" aria-label="Tutup" onClick={onClose} disabled={isSubmitting}>
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="abs-permission-body">
          <div className="abs-permission-field">
            <span className="abs-permission-label">Pilihan Jenis Izin</span>
            <Dropdown
              name="permissionType"
              value={type}
              onChange={handleTypeChange}
              options={earlyCheckout ? TYPE_OPTIONS.slice(0, 1) : TYPE_OPTIONS}
              disabled={isSubmitting}
              ariaLabel="Pilihan jenis izin"
            />
          </div>

          <div className="abs-permission-field">
            <label className="abs-permission-label" htmlFor="abs-permission-note">Keterangan / Alasan</label>
            <textarea
              id="abs-permission-note"
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={isSick ? 'Jelaskan kondisi / keluhan sakit Anda...' : 'Jelaskan kendala yang membuat Anda terlambat...'}
              disabled={isSubmitting}
            />
          </div>

          {isSick && (
            <div className="abs-permission-field">
              <span className="abs-permission-label">Unggah / Foto Surat Dokter (Bukti Sakit)</span>
              <MedicalDocumentDropzone
                file={documentFile}
                onChange={setDocumentFile}
                onError={setErrorMessage}
                disabled={isSubmitting || documentLater}
              />
              <div className="abs-permission-options">
                <label className="abs-permission-check">
                  <input
                    type="checkbox"
                    checked={documentLater}
                    onChange={handleDocumentLaterChange}
                    disabled={isSubmitting}
                  />
                  Surat dokter menyusul
                </label>
              </div>
              <SickDateFields dates={dates} documentLater={documentLater} earlyCheckout={earlyCheckout} disabled={isSubmitting} />
              <p className="abs-permission-hint">Surat dokter tetap wajib diunggah. Jika menyusul, unggah lewat kolom Keterangan / Catatan atau riwayat pengajuan.</p>
            </div>
          )}

          {errorMessage && <p className="abs-permission-error" role="alert">{errorMessage}</p>}
        </div>

        <div className="abs-permission-footer">
          <button type="button" className="abs-permission-cancel" onClick={onClose} disabled={isSubmitting}>
            Batal
          </button>
          <button type="button" className="abs-permission-submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan Izin'}
          </button>
        </div>
      </div>
    </div>
  );
}
