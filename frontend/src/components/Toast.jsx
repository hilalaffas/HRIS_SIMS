import React, { useEffect, useRef, useState } from 'react';
import './Toast.css';

// [UBAH] Toast ini sekarang menjadi SATU-SATUNYA komponen toast di seluruh
// aplikasi (lihat ProfileToast.jsx yang dihapus -- fungsinya sekarang
// dipenuhi oleh komponen ini) supaya semua notifikasi toast (App.jsx,
// Karyawan, FormKaryawan, Absensi, Lembur, Persetujuan, Announcement,
// Holiday, Profile) tampil identik: warna, ukuran, timing, dan animasi.
//
// [UBAH] Sebelumnya pemanggil me-mount/unmount Toast secara instan lewat
// `{toast && <Toast .../>}`, jadi toast langsung lenyap tanpa animasi
// keluar (cuma animasi masuk yang pernah kelihatan, itu pun belum ada
// animasinya di versi lama). Sekarang pemanggil WAJIB selalu me-render
// <Toast show={...} .../> (lihat semua call site yang sudah disesuaikan),
// dan komponen ini yang mengatur sendiri kapan benar-benar lepas dari DOM
// -- menunggu animasi keluar selesai dulu (EXIT_DURATION, harus sinkron
// dengan durasi @keyframes toast-out di Toast.css).
const EXIT_DURATION = 200;

const ICON_PATHS = {
  success: 'M5 13l4 4L19 7',
  error: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
};

export default function Toast({ show = true, message, type = 'success', actionLabel, onAction }) {
  const isSuccess = type === 'success';

  // mounted: apakah node toast masih ada di DOM sama sekali.
  // Dipisah dari `show` supaya saat show berubah jadi false, node TETAP
  // di-render sejenak (dengan class animasi keluar) sebelum benar-benar
  // di-unmount -- kalau tidak, animasi keluar tidak akan sempat terlihat.
  const [mounted, setMounted] = useState(show);
  const exitTimerRef = useRef(null);

  useEffect(() => {
    window.clearTimeout(exitTimerRef.current);

    if (show) {
      setMounted(true);
    } else if (mounted) {
      exitTimerRef.current = window.setTimeout(() => setMounted(false), EXIT_DURATION);
    }

    return () => window.clearTimeout(exitTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sengaja cuma depend ke `show`
  }, [show]);

  if (!mounted) return null;

  return (
    <div
      className={`toast-base ${isSuccess ? 'toast-success' : 'toast-error'} ${show ? 'toast-enter' : 'toast-exit'}`}
      role="status"
      aria-live="polite"
    >
      <div className="toast-row">
        <svg className="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={ICON_PATHS[isSuccess ? 'success' : 'error']} />
        </svg>
        <span className="toast-message">{message}</span>
      </div>

      {/* Link aksi opsional (mis. "Detail") -- lihat Toast.css untuk gaya
          .toast-action yang SEBELUMNYA dipakai di sini tapi tidak pernah
          benar-benar punya CSS (tombolnya tampil polos/default browser). */}
      {actionLabel && onAction && (
        <button type="button" className="toast-action" onClick={onAction}>
          <span className="toast-action-dot" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
