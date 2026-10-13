// src/pages/Dashboard/hooks/useLiveClock.js
//
// [BARU] Jam WIB yang berjalan ("07:45 WIB"). Interval berdetak tiap detik,
// tetapi state hanya berubah (dan komponen hanya re-render) sekali per menit.
// Hanya untuk TAMPILAN -- jam resmi absensi tetap dicatat oleh server.
import { useEffect, useState } from 'react';

const formatClock = (date) =>
  `${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  })} WIB`;

export default function useLiveClock() {
  const [clock, setClock] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const intervalId = window.setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return clock;
}
