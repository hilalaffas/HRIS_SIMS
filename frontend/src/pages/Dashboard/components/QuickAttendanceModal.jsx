// src/pages/Dashboard/components/QuickAttendanceModal.jsx
//
// [BARU] Popup "Ambil Foto & Konfirmasi Lokasi" yang muncul LANGSUNG di
// Dashboard (tanpa pindah ke halaman Absensi Saya). Hanya tampilan: semua
// logika kamera/GPS/kirim ada di hooks Absensi/hooks/useAttendanceCapture.js
// sehingga alur backend-nya sama persis dengan halaman Absensi Saya.
//
// Sengaja TIDAK ada: tombol Sakit/Izin (diajukan lewat Absensi Saya) dan
// unggah foto dari galeri (bukti harus selfie langsung dari kamera).
//
// Contoh pemakaian:
// <QuickAttendanceModal capture={capture} shiftHours="08:00 - 17:00" />
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  Check,
  Info,
  Loader2,
  MapPinned,
  RefreshCw,
  X,
} from 'lucide-react';
import { ATTENDANCE_NOTE_MAX_LENGTH } from '../../Absensi/hooks/useAttendanceCapture';
import useLiveClock from '../hooks/useLiveClock';
import './QuickAttendanceModal.css';

const MAP_HALF_SPAN = 0.004; // ~450 m di sekeliling titik pengguna
const LOW_ACCURACY_METERS = 100;

// [BARU] Key Google Maps Embed API (publik, terlihat di browser). WAJIB dibatasi di
// Google Cloud Console: HTTP referrer = domain aplikasi, API restriction = Maps Embed API.
// Kalau tidak diatur, peta otomatis memakai OpenStreetMap (tanpa key).
const GOOGLE_MAPS_EMBED_KEY = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY || '';

// Pembatasan key lewat HTTP referrer butuh header Referer (origin saja), jadi untuk
// Google tidak boleh 'no-referrer'. OpenStreetMap tidak perlu -> tidak ada yang bocor.
const MAP_REFERRER_POLICY = GOOGLE_MAPS_EMBED_KEY ? 'strict-origin-when-cross-origin' : 'no-referrer';

// Koordinat berupa angka dari GPS browser (bukan input teks), jadi aman
// disusun ke dalam URL peta.
function buildMapEmbedUrl({ lat, lng }) {
  if (GOOGLE_MAPS_EMBED_KEY) {
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_EMBED_KEY,
      q: `${lat},${lng}`,
      zoom: '17',
      language: 'id',
    });
    return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
  }

  // Cadangan: OpenStreetMap
  const params = new URLSearchParams({
    bbox: [lng - MAP_HALF_SPAN, lat - MAP_HALF_SPAN, lng + MAP_HALF_SPAN, lat + MAP_HALF_SPAN].join(','),
    layer: 'mapnik',
    marker: `${lat},${lng}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

function gpsBadgeText(locationStatus, coords) {
  if (locationStatus === 'ready') return `GPS: Aktif (±${coords.accuracy} m)`;
  if (locationStatus === 'error') return 'GPS: Tidak aktif';
  return 'GPS: Mencari sinyal...';
}

export default function QuickAttendanceModal({ capture, shiftHours }) {
  const {
    action, note, captured, cameraError, submitError, coords,
    locationStatus, locationError, locationName, isLocationNameLoading, isSubmitting,
    attachVideo, close, takePhoto, retake, submit, refreshLocation, setNote,
  } = capture;

  const navigate = useNavigate();
  const clock = useLiveClock();
  const dialogRef = useRef(null);

  // Komponen ini hanya di-mount saat popup terbuka (lihat DashboardSummaryCard),
  // jadi jam & efek di bawah tidak berjalan ketika popup tertutup.
  // Escape menutup modal, scroll halaman dikunci, fokus dipindah ke dialog.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close]);

  const hasLocation = Boolean(coords);
  const canSubmit = Boolean(captured) && hasLocation && !isSubmitting;
  const isLowAccuracy = hasLocation && coords.accuracy > LOW_ACCURACY_METERS;

  const handleOpenAbsensiPage = () => {
    close();
    navigate('/absensi');
  };

  return (
    <div className="quickAtt__backdrop" role="presentation" onClick={close}>
      <div
        ref={dialogRef}
        className="quickAtt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickAttTitle"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="quickAtt__header">
          <h2 id="quickAttTitle">
            <Camera size={18} aria-hidden="true" />
            Ambil Foto &amp; Konfirmasi Lokasi {action}
          </h2>
          <button type="button" className="quickAtt__close" aria-label="Tutup" onClick={close} disabled={isSubmitting}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="quickAtt__body">
          {/* ---------- Kamera ---------- */}
          <div className={`quickAtt__camera ${captured ? 'is-captured' : ''}`}>
            {cameraError ? (
              <div className="quickAtt__cameraError" role="alert">
                <Camera size={28} aria-hidden="true" />
                <p>{cameraError}</p>
                <button type="button" className="quickAtt__link" onClick={handleOpenAbsensiPage}>
                  Buka Absensi Saya
                </button>
              </div>
            ) : (
              <>
                {/* <video> tetap terpasang saat foto sudah diambil, supaya "Ambil ulang" langsung hidup lagi */}
                <video ref={attachVideo} className="quickAtt__video" autoPlay playsInline muted hidden={Boolean(captured)} />
                {captured && (
                  <>
                    <img className="quickAtt__photo" src={captured} alt="Pratinjau selfie absensi" />
                    <span className="quickAtt__flash" aria-hidden="true" />
                  </>
                )}
              </>
            )}

            <div className="quickAtt__cameraBar">
              <span className={`quickAtt__gps quickAtt__gps--${locationStatus}`}>
                <i aria-hidden="true" />
                {gpsBadgeText(locationStatus, coords)}
              </span>
              <time>{clock}</time>
            </div>
          </div>

          {/* ---------- Peta & titik lokasi ---------- */}
          <div className="quickAtt__map">
            {hasLocation ? (
              <iframe
                key={`${coords.lat}-${coords.lng}`}
                className="quickAtt__mapFrame"
                title="Peta titik lokasi Anda"
                src={buildMapEmbedUrl(coords)}
                loading="lazy"
                referrerPolicy={MAP_REFERRER_POLICY}
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            ) : (
              <div className="quickAtt__mapPlaceholder" aria-hidden="true">
                {locationStatus === 'loading' && <Loader2 size={26} className="quickAtt__spin" />}
              </div>
            )}

            <div className="quickAtt__locationCard">
              <div className="quickAtt__locationHead">
                <strong>
                  <MapPinned size={14} aria-hidden="true" />
                  Titik Lokasi Anda
                </strong>
                <button
                  type="button"
                  className="quickAtt__refresh"
                  onClick={refreshLocation}
                  disabled={locationStatus === 'loading' || isSubmitting}
                  aria-label="Perbarui lokasi"
                  title="Perbarui lokasi"
                >
                  <RefreshCw size={13} aria-hidden="true" className={locationStatus === 'loading' ? 'quickAtt__spin' : ''} />
                </button>
              </div>

              {locationStatus === 'loading' && <p className="quickAtt__muted">Mengambil lokasi...</p>}
              {locationStatus === 'error' && <p className="quickAtt__error">{locationError}</p>}
              {hasLocation && (
                <>
                  {/* [BARU] Nama tempat dari backend (reverse geocoding). Kosong = hanya koordinat. */}
                  {isLocationNameLoading && <p className="quickAtt__muted">Mencari nama lokasi...</p>}
                  {locationName && <p className="quickAtt__place" title={locationName}>{locationName}</p>}
                  <code className="quickAtt__coords">
                    Lat: {coords.lat.toFixed(4)} | Lng: {coords.lng.toFixed(4)} | Akurasi: {coords.accuracy}m
                  </code>
                  {isLowAccuracy && (
                    <p className="quickAtt__warn">
                      <AlertTriangle size={12} aria-hidden="true" />
                      Akurasi rendah. Pindah ke area terbuka lalu tekan perbarui.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ---------- Detail presensi + keterangan ---------- */}
        <section className="quickAtt__detail">
          <h3>Detail Presensi:</h3>
          <p>
            Shift Normal Kerja: <strong>{shiftHours} WIB</strong>
          </p>

          <label className="quickAtt__noteField" htmlFor="quickAttNote">
            Keterangan <span>(opsional)</span>
          </label>
          <textarea
            id="quickAttNote"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={ATTENDANCE_NOTE_MAX_LENGTH}
            rows={2}
            placeholder="Tambahkan keterangan bila diperlukan"
            disabled={isSubmitting}
          />
          <div className="quickAtt__noteMeta">
            <span className="quickAtt__hint">
              <Info size={12} aria-hidden="true" />
              Jam resmi absensi dicatat oleh server, bukan jam perangkat.
            </span>
            <span>{note.length}/{ATTENDANCE_NOTE_MAX_LENGTH}</span>
          </div>
        </section>

        {submitError && (
          <p className="quickAtt__alert" role="alert">
            <AlertTriangle size={14} aria-hidden="true" />
            {submitError}
          </p>
        )}

        <footer className="quickAtt__footer">
          <button type="button" className="quickAtt__btn quickAtt__btn--text" onClick={close} disabled={isSubmitting}>
            Batal
          </button>

          {captured ? (
            <div className="quickAtt__footerActions">
              <button type="button" className="quickAtt__btn quickAtt__btn--outline" onClick={retake} disabled={isSubmitting}>
                Ambil Ulang
              </button>
              <button type="button" className="quickAtt__btn quickAtt__btn--send" onClick={submit} disabled={!canSubmit}>
                {isSubmitting ? <Loader2 size={15} className="quickAtt__spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                {isSubmitting ? 'Mengirim...' : 'Kirim Absensi'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="quickAtt__btn quickAtt__btn--capture"
              onClick={takePhoto}
              disabled={Boolean(cameraError)}
            >
              <Camera size={15} aria-hidden="true" />
              Ambil Foto
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
