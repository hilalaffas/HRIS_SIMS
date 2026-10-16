// src/pages/Absensi/components/PermissionRequestModal.jsx
//
// [BARU] Popup "Pengajuan Izin / Surat Sakit" (dibuka tombol "Ajukan Izin / Sakit").
// Menggantikan alur Sakit lama yang memakai kamera + GPS (AttendanceCameraModal).
//
//  - Izin Sakit      : lama izin (hari) + keterangan + surat dokter. Surat boleh
//                      MENYUSUL -- tetap wajib, diunggah belakangan lewat kolom
//                      "Keterangan / Catatan" di tabel riwayat.
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
import MedicalDocumentDropzone from './MedicalDocumentDropzone';
import './PermissionRequestModal.css';

const TYPE_OPTIONS = [
  { value: 'SAKIT', label: 'Izin Sakit (Butuh Surat Sakit Dokter)' },
  { value: 'TERLAMBAT', label: 'Izin Terlambat (Kendala Tak Terduga)' },
];
const NOTE_MAX_LENGTH = 255; // attendances.note VARCHAR(255)
const MAX_SICK_DAYS = 30; // sama dengan AttendanceService.MAX_SICK_DAYS

export default function PermissionRequestModal({ onSubmit, onClose }) {
  const submitLockRef = useRef(false); // gerbang sinkron anti double-submit
  const [type, setType] = useState('SAKIT');
  const [days, setDays] = useState('1');
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
    if (event.target.checked) setDocumentFile(null);
    setErrorMessage('');
  };

  const validate = () => {
    if (!note.trim()) return 'Keterangan wajib diisi.';
    if (isSick) {
      const dayCount = Number(days);
      if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > MAX_SICK_DAYS) {
        return `Lama izin sakit harus 1 sampai ${MAX_SICK_DAYS} hari.`;
      }
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
        days: Number(days),
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
              options={TYPE_OPTIONS}
              disabled={isSubmitting}
              ariaLabel="Pilihan jenis izin"
            />
          </div>

          {isSick && (
            <div className="abs-permission-field">
              <label className="abs-permission-label" htmlFor="abs-permission-days">Lama Izin Sakit</label>
              <div className="abs-permission-days">
                <input
                  id="abs-permission-days"
                  type="number"
                  min="1"
                  max={MAX_SICK_DAYS}
                  step="1"
                  inputMode="numeric"
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  disabled={isSubmitting}
                />
                <span>hari (dihitung mulai hari ini)</span>
              </div>
            </div>
          )}

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
              <label className="abs-permission-check">
                <input
                  type="checkbox"
                  checked={documentLater}
                  onChange={handleDocumentLaterChange}
                  disabled={isSubmitting}
                />
                Surat dokter menyusul
              </label>
              <p className="abs-permission-hint">
                Surat dokter tetap wajib diunggah. Bila menyusul, unggah lewat kolom Keterangan / Catatan
                pada tabel Jadwal &amp; Log Absensi Bulanan.
              </p>
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
