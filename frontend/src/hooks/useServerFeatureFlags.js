// src/hooks/useServerFeatureFlags.js
//
// Menjaga cache flag fitur (utils/featureFlags.js) tetap sama dengan server.
// Dipasang sekali di layouts/MainLayout.jsx, jadi hanya jalan saat user sudah
// login. Memuat saat layout tampil, lalu menyegarkan tiap menit dan setiap
// tab kembali dibuka -- supaya perubahan dari /supersecret sampai ke browser
// lain tanpa perlu logout atau reload.
import { useEffect } from 'react';
import { fetchFeatureFlags } from '../services/featureFlagService';

const REFRESH_INTERVAL_MS = 60 * 1000;

export default function useServerFeatureFlags() {
  useEffect(() => {
    const refresh = async () => {
      try {
        await fetchFeatureFlags();
      } catch {
        // Server tidak terjangkau / sesi bermasalah: biarkan nilai cache terakhir
        // dipakai. Kasus sesi habis sudah ditangani alur 'sims:session-expired'.
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    refresh();
    const intervalId = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, []);
}
