// src/components/LoadingScreen.jsx
//
// [BARU] Splash screen global yang tampil otomatis setiap kali ada request
// GET (data halaman) sedang berjalan -- dipicu event 'sims:loading-start' /
// 'sims:loading-end' yang di-broadcast services/api.js (lihat komentar
// beginGlobalLoading/endGlobalLoading di sana). Komponen ini TIDAK perlu
// tahu request mana yang sedang jalan -- dia cuma dengar 2 event itu dan
// atur progress bar + reveal logo sendiri (pola sama seperti
// SessionExpiredModal: decoupled lewat CustomEvent, bukan prop-drilling).
//
// CATATAN PENTING -- LOGO MASIH PLACEHOLDER:
// Konsep aslinya (garis hijau di bawah teks "SIMS" pada sims_logo.svg yang
// memanjang 0% -> 100%, lalu teks menyala saat garis menyentuh titik di
// ujungnya) BELUM bisa diimplementasi presisi karena file sims_logo.svg
// belum berhasil ter-upload ke saya. Struktur di bawah ini SENGAJA dibuat
// modular (elemen __wordmark, __track, __bar, __dot terpisah) supaya begitu
// file SVG asli ada, tinggal:
//   1. Ganti isi <span className="loading-screen__wordmark"> dengan markup
//      SVG asli (atau pecah jadi <svg> tersendiri kalau teksnya berupa path).
//   2. Sesuaikan lebar .loading-screen__track di LoadingScreen.css supaya
//      pas dengan lebar asli garis+titik pada SVG.
//   3. Logic progress (di bawah) TIDAK perlu diubah sama sekali.
//
// Cuma request GET yang memicu ini (lihat api.js) -- aksi simpan/update/hapus
// TIDAK memicu splash ini, supaya tidak bentrok dengan pola tombol
// "Menyimpan..." yang sudah ada di berbagai form.
import React, { useEffect, useRef, useState } from 'react';
import './LoadingScreen.css';
import { isLoadingScreenEnabled, FEATURE_FLAG_CHANGE_EVENT } from '../utils/featureFlags'; // [BARU]

// [BARU] Konstanta timing -- sengaja dikumpulkan di satu tempat supaya
// gampang di-tuning tanpa bongkar logic di bawah.
const SHOW_DELAY_MS = 150; // request lebih cepat dari ini tidak perlu splash sama sekali (anti-flash)
const MIN_VISIBLE_MS = 450; // begitu progress capai 100%, splash minimal tampil segini dulu sebelum fade-out (supaya animasi "logo menyala" sempat kelihatan)
const FADE_OUT_MS = 400; // harus sinkron dengan transition opacity di LoadingScreen.css
const TRICKLE_TARGET = 88; // progress simulasi berhenti di angka ini selama menunggu respons asli (gaya nprogress/YouTube)
const TRICKLE_INTERVAL_MS = 120;

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  // idle: tidak dirender sama sekali | active: splash tampil, progress jalan
  // | complete: progress 100%, logo menyala | hiding: fade-out
  const [phase, setPhase] = useState('idle');

  const showTimerRef = useRef(null);
  const trickleTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    const clearAllTimers = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (trickleTimerRef.current) {
        clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const startTrickle = () => {
      setProgress(8); // langsung loncat kecil dulu supaya terasa responsif, bukan diam di 0
      trickleTimerRef.current = setInterval(() => {
        setProgress((current) => {
          if (current >= TRICKLE_TARGET) return current;
          // Makin dekat TRICKLE_TARGET, makin kecil langkahnya -- kesan
          // "melambat karena menunggu server", bukan naik linear kaku.
          const remaining = TRICKLE_TARGET - current;
          const step = Math.max(0.5, remaining * 0.08);
          return Math.min(TRICKLE_TARGET, current + step);
        });
      }, TRICKLE_INTERVAL_MS);
    };

    const handleLoadingStart = () => {
      // [BARU] Splash ini sekarang bisa dimatikan lewat halaman pengaturan
      // tersembunyi (lihat utils/featureFlags.js) -- kalau nonaktif, jangan
      // jadwalkan apa-apa sama sekali. Skeleton loading per-halaman tetap
      // jalan seperti biasa, tidak terpengaruh flag ini.
      if (!isLoadingScreenEnabled()) return;

      // Kalau sebelumnya sedang fade-out (siklus lama), batalkan dulu lalu
      // mulai siklus baru dari awal.
      clearAllTimers();
      showTimerRef.current = setTimeout(() => {
        showTimerRef.current = null;
        setPhase('active');
        startTrickle();
      }, SHOW_DELAY_MS);
    };

    const handleLoadingEnd = () => {
      if (showTimerRef.current) {
        // Request-nya selesai SEBELUM delay anti-flash habis -- berarti
        // cepat banget, splash tidak perlu ditampilkan sama sekali.
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
        return;
      }
      if (trickleTimerRef.current) {
        clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }

      setProgress(100);
      setPhase('complete');

      hideTimerRef.current = setTimeout(() => {
        setPhase('hiding');
        hideTimerRef.current = setTimeout(() => {
          setPhase('idle');
          setProgress(0);
          hideTimerRef.current = null;
        }, FADE_OUT_MS);
      }, MIN_VISIBLE_MS);
    };

    // [BARU] Kalau flag dimatikan LEWAT halaman pengaturan SAAT splash
    // sedang tampil (mis. dipakai untuk preview), langsung sembunyikan --
    // tidak perlu tunggu request berikutnya.
    const handleFlagChange = (event) => {
      if (event.detail?.key === 'loadingScreen' && !event.detail.value) {
        clearAllTimers();
        setPhase('idle');
        setProgress(0);
      }
    };

    window.addEventListener('sims:loading-start', handleLoadingStart);
    window.addEventListener('sims:loading-end', handleLoadingEnd);
    window.addEventListener(FEATURE_FLAG_CHANGE_EVENT, handleFlagChange);

    return () => {
      window.removeEventListener('sims:loading-start', handleLoadingStart);
      window.removeEventListener('sims:loading-end', handleLoadingEnd);
      window.removeEventListener(FEATURE_FLAG_CHANGE_EVENT, handleFlagChange);
      clearAllTimers();
    };
  }, []);

  if (phase === 'idle') return null;

  return (
    <div
      className={`loading-screen loading-screen--${phase}`}
      role="status"
      aria-live="polite"
      aria-label="Memuat data"
    >
      <div className="loading-screen__logo">
        {/* [BELUM] Placeholder wordmark teks -- ganti dengan markup SVG asli
            (sims_logo.svg) begitu file-nya tersedia. Lihat catatan di atas. */}
        <span className="loading-screen__wordmark">SIMS</span>
        <div className="loading-screen__track">
          <div
            className="loading-screen__bar"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
          <span className="loading-screen__dot" />
        </div>
      </div>
    </div>
  );
}
