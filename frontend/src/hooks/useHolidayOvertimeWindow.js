// src/hooks/useHolidayOvertimeWindow.js
//
// [BARU] Kalender pengajuan & jendela absen lembur hari libur dari GET /api/lembur/holiday-window.
// Dimuat saat mount, lalu disegarkan tiap menit (hanya saat tab terlihat) dan saat jendela
// kembali difokuskan, sehingga lembur yang baru disetujui langsung membuka tombol absen.
// Satu request ringan -- menggantikan muat ulang seluruh riwayat setiap menit.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getHolidayOvertimeWindow } from '../services/overtimeService';

const POLL_INTERVAL_MS = 60000;

export default function useHolidayOvertimeWindow() {
  const [holidayWindow, setHolidayWindow] = useState(null);
  const [error, setError] = useState('');
  const isMountedRef = useRef(true); // cegah setState setelah unmount

  const refresh = useCallback(async () => {
    try {
      const data = await getHolidayOvertimeWindow();
      if (!isMountedRef.current) return;
      setHolidayWindow(data);
      setError('');
    } catch (requestError) {
      // Data lama dipertahankan; hanya pesan galat yang diperbarui.
      if (isMountedRef.current) setError(requestError?.message || 'Gagal memuat kalender lembur.');
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    Promise.resolve().then(refresh); // pola sama dengan absensi.jsx: bukan setState sinkron di dalam effect
    const refreshIfVisible = () => { if (!document.hidden) refresh(); };
    const timer = window.setInterval(refreshIfVisible, POLL_INTERVAL_MS);
    window.addEventListener('focus', refreshIfVisible);
    return () => {
      isMountedRef.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshIfVisible);
    };
  }, [refresh]);

  return { holidayWindow, error, refresh };
}
