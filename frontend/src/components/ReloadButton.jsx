// src/components/ReloadButton.jsx
//
// [BARU] Tombol "Muat Ulang" bersama untuk semua tabel: ambil ulang data dari server tanpa
// me-refresh browser, jadi tab aktif, pencarian, filter, dan halaman yang sedang dibuka tidak
// ikut ter-reset.
//
// Cara pakai:
//   <ReloadButton onReload={handleReload} />                    // onReload boleh mengembalikan Promise
//   <ReloadButton onReload={reload} isLoading={isLoading} />    // atau status loading dari luar
//
// Status "memuat" = prop isLoading ATAU Promise dari onReload yang belum selesai. Putaran ikon
// minimal MIN_SPIN_MS supaya ada umpan balik walau server membalas sangat cepat.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import './ReloadButton.css';

const MIN_SPIN_MS = 600;

export default function ReloadButton({
  onReload,
  isLoading = false,
  label = 'Muat Ulang',
  title = 'Ambil ulang data terbaru dari server',
  className = '',
}) {
  const [isPending, setIsPending] = useState(false);
  const isMountedRef = useRef(true);
  const isBusyRef = useRef(false); // gerbang sinkron anti klik ganda

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handleClick = useCallback(async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setIsPending(true);
    const startedAt = Date.now();
    try {
      await onReload?.();
    } catch (error) {
      console.error('Gagal memuat ulang data:', error);
    } finally {
      const remaining = Math.max(0, MIN_SPIN_MS - (Date.now() - startedAt));
      window.setTimeout(() => {
        isBusyRef.current = false;
        if (isMountedRef.current) setIsPending(false);
      }, remaining);
    }
  }, [onReload]);

  const isBusy = isLoading || isPending;

  return (
    <button
      type="button"
      className={`reloadBtn${isBusy ? ' reloadBtn--loading' : ''} ${className}`.trim()}
      onClick={handleClick}
      disabled={isBusy}
      aria-busy={isBusy}
      title={title}
    >
      <RefreshCw aria-hidden="true" />
      <span>{isBusy ? 'Memuat...' : label}</span>
    </button>
  );
}
