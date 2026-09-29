// src/pages/Absensi/components/AttendanceCameraModal.jsx
//
// [BARU] Modal "Ambil foto Anda" -- membuka kamera perangkat, mengambil
// snapshot sebagai bukti kehadiran, lalu melengkapi jenis absensi
// (Absen/Sakit/Izin), keterangan, dan titik lokasi sebelum dikirim.
// Semua logic kamera & geolocation di-lift ke absensi.jsx (parent) dan
// modal ini murni presentational + form lokal (reason/note), supaya
// mengikuti pola form terpisah seperti LeaveForm.jsx di modul Cuti.
import React, { useEffect, useRef } from 'react';
import { Camera, Check, MapPin, X } from 'lucide-react';
import './AttendanceCameraModal.css';

const REASON_OPTIONS = ['Absen', 'Sakit', 'Izin'];

export default function AttendanceCameraModal({
  attendanceAction,
  videoRef,
  captured,
  cameraError,
  reason,
  note,
  location,
  coords,
  locationLoading,
  submitting,
  onReasonChange,
  onNoteChange,
  onRefreshLocation,
  onTakePhoto,
  onRetake,
  onUploadFallback,
  onConfirm,
  onClose,
}) {
  const noteRequired = reason !== 'Absen';
  // [BARU] `coords` (koordinat GPS numerik) WAJIB ada -- backend menolak
  // pengajuan tanpa lokasi (AttendanceService.submit()), jadi tombol kirim
  // ikut dinonaktifkan di sisi frontend supaya errornya langsung terasa
  // di sini, bukan baru muncul setelah request ke server.
  const hasLocation = Boolean(coords);
  const canConfirm = Boolean(captured) && (!noteRequired || note.trim().length > 0) && hasLocation && !submitting;
  const dialogRef = useRef(null);
  const mapsUrl = coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;

  // [BARU] Tutup modal dengan tombol Escape -- gesture keyboard umum untuk
  // dialog modal, belum ada di file lain sebelumnya jadi ditambahkan di sini.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="abs-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="abs-camera-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="abs-camera-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="abs-modal-header">
          <div>
            <p className="abs-eyebrow">BUKTI KEHADIRAN &middot; {attendanceAction === 'Masuk' ? 'Absen Masuk' : 'Absen Keluar'}</p>
            <h2 id="abs-camera-title">Ambil foto Anda</h2>
          </div>
          <button type="button" aria-label="Tutup kamera" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>

        {cameraError ? (
          <div className="abs-camera-error">
            <Camera aria-hidden="true" />
            <p>{cameraError}</p>
            <label className="abs-upload-button">
              Unggah foto
              <input type="file" accept="image/*" onChange={onUploadFallback} />
            </label>
          </div>
        ) : captured ? (
          <img className="abs-captured-image" src={captured} alt="Pratinjau foto absensi" />
        ) : (
          <div className="abs-video-frame">
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="abs-face-guide" />
          </div>
        )}

        <div className="abs-attendance-form">
          <fieldset>
            <legend>Jenis absensi</legend>
            <div className="abs-reason-options">
              {REASON_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`abs-reason-option ${reason === option ? 'is-selected' : ''}`}
                  onClick={() => onReasonChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="abs-note-field">
            Keterangan {noteRequired && <span>(wajib)</span>}
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder={reason === 'Absen' ? 'Tambahkan keterangan bila diperlukan' : `Jelaskan alasan ${reason.toLowerCase()}...`}
              rows={2}
            />
          </label>

          <div className="abs-location-field">
            <div>
              <span>Titik lokasi</span>
              <strong>{locationLoading ? 'Mengambil lokasi...' : location}</strong>
              {/* [BARU] Link Google Maps dari koordinat GPS yang baru saja
                  diambil -- supaya user (dan HR nanti) bisa langsung
                  memverifikasi titik lokasinya di peta, bukan cuma angka
                  lat/lng mentah. */}
              {mapsUrl && (
                <a className="abs-maps-link" href={mapsUrl} target="_blank" rel="noreferrer">
                  <MapPin aria-hidden="true" />
                  Buka di Google Maps
                </a>
              )}
              {!locationLoading && !hasLocation && (
                <span className="abs-location-warning">Aktifkan izin lokasi untuk melanjutkan absensi.</span>
              )}
            </div>
            <button type="button" onClick={onRefreshLocation} disabled={locationLoading}>
              Perbarui
            </button>
          </div>
        </div>

        <div className="abs-modal-footer">
          {captured ? (
            <>
              <button type="button" className="abs-outline-button" onClick={onRetake} disabled={submitting}>
                Ambil ulang
              </button>
              <button
                type="button"
                className="abs-primary-button"
                onClick={onConfirm}
                disabled={!canConfirm}
              >
                <Check aria-hidden="true" />
                {submitting ? 'Mengirim...' : 'Kirim Absensi'}
              </button>
            </>
          ) : (
            !cameraError && (
              <button type="button" className="abs-capture-button" onClick={onTakePhoto} aria-label="Ambil foto">
                <span />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
