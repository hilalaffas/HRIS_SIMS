import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './NotifBellToast.css';

// Popup mini yang "keluar" dari ikon lonceng saat ada notifikasi baru.
// Murni presentasi: Navbar.jsx yang memutuskan KAPAN popup tampil.

const DURATION_MS = 5000; // harus sama dengan lama progress bar (CSS var)
const EXIT_MS = 220;      // harus sama dengan durasi animasi bellToastOut
const GAP = 12;           // jarak minimum popup ke tepi layar
const MAX_WIDTH = 320;
const ARROW_PAD = 20;     // panah tidak boleh terlalu dekat sudut popup

const TYPE_META = {
  approved: { tone: 'success', title: 'Pengajuan disetujui' },
  'step-approved': { tone: 'success', title: 'Persetujuan bertahap' },
  returned: { tone: 'warning', title: 'Pengajuan dikembalikan' },
  rejected: { tone: 'danger', title: 'Pengajuan ditolak' },
  new: { tone: 'brand', title: 'Pengajuan baru' },
  'leave-approval': { tone: 'brand', title: 'Pengajuan baru' },
  'password-reset': { tone: 'info', title: 'Permintaan reset sandi' },
};
const DEFAULT_META = { tone: 'brand', title: 'Notifikasi baru' };

const ICON_PATHS = {
  success: <path d="M20 6 9 17l-5-5" />,
  warning: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  danger: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01" />
      <path d="M11 12h1v4h1" />
    </>
  ),
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Props:
 * - notification : { type, text, ... } notifikasi terbaru yang memicu popup
 * - extraCount   : jumlah notifikasi lain yang masuk bersamaan
 * - anchorRef    : ref tombol lonceng (untuk menghitung posisi)
 * - onOpen       : dipanggil saat popup diklik (buka daftar notifikasi)
 * - onClose      : dipanggil setelah animasi keluar selesai
 * Pasang dengan `key` unik per popup supaya state & animasi mulai dari awal.
 */
export default function NotifBellToast({ notification, extraCount = 0, anchorRef, onOpen, onClose }) {
  const [pos, setPos] = useState(null);
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const remainingRef = useRef(DURATION_MS);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);     // timer tutup otomatis
  const exitTimerRef = useRef(null); // timer setelah animasi keluar
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Posisi dihitung dari lonceng yang SEBENARNYA (position: fixed), jadi akurat
  // di desktop, HP, rotasi layar, maupun jika susunan navbar berubah.
  const measure = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const width = Math.min(MAX_WIDTH, viewportWidth - GAP * 2);
    const left = clamp(rect.right + 8 - width, GAP, viewportWidth - width - GAP);
    const centerX = rect.left + rect.width / 2;
    setPos({
      top: Math.round(rect.bottom + 12),
      left: Math.round(left),
      width: Math.round(width),
      arrowX: Math.round(clamp(centerX - left, ARROW_PAD, width - ARROW_PAD)),
    });
  };

  useLayoutEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLeaving = () => {
    clearTimeout(timerRef.current);
    clearTimeout(exitTimerRef.current);
    setLeaving(true);
    exitTimerRef.current = setTimeout(() => onCloseRef.current(), EXIT_MS);
  };

  // Timer tutup otomatis; berhenti saat di-hover / fokus, lanjut dari sisa waktu.
  useEffect(() => {
    if (leaving) return undefined;
    if (paused) {
      clearTimeout(timerRef.current);
      remainingRef.current -= Date.now() - startedAtRef.current;
      return undefined;
    }
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(startLeaving, Math.max(remainingRef.current, 0));
    return () => clearTimeout(timerRef.current);
  }, [paused, leaving]);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') startLeaving(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(timerRef.current);
      clearTimeout(exitTimerRef.current);
    };
  }, []);

  if (!notification || !pos) return null;

  const meta = TYPE_META[notification.type] || DEFAULT_META;
  const iconKey = ICON_PATHS[meta.tone] ? meta.tone : 'info';
  const pauseOnMouse = (event) => { if (event.pointerType === 'mouse') setPaused(true); };
  const resumeOnMouse = (event) => { if (event.pointerType === 'mouse') setPaused(false); };

  return (
    <div
      className={`bell-toast bell-toast--${meta.tone}${leaving ? ' bell-toast--leaving' : ''}${paused ? ' bell-toast--paused' : ''}`}
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        '--bell-toast-arrow-x': `${pos.arrowX}px`,
        '--bell-toast-duration': `${DURATION_MS}ms`,
      }}
      role="status"
      aria-live="polite"
      onPointerEnter={pauseOnMouse}
      onPointerLeave={resumeOnMouse}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button type="button" className="bell-toast__main" onClick={onOpen}>
        <span className="bell-toast__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {ICON_PATHS[iconKey]}
          </svg>
        </span>
        <span className="bell-toast__body">
          <strong className="bell-toast__title">{meta.title}</strong>
          <span className="bell-toast__text">{notification.text}</span>
          <span className="bell-toast__meta">
            Baru saja{extraCount > 0 ? ` · +${extraCount} notifikasi lainnya` : ''}
          </span>
        </span>
      </button>
      <button type="button" className="bell-toast__close" aria-label="Tutup notifikasi" onClick={startLeaving}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <i className="bell-toast__bar" aria-hidden="true" />
    </div>
  );
}
