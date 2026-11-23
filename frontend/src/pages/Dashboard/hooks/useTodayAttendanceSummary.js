// src/pages/Dashboard/hooks/useTodayAttendanceSummary.js
//
// [BARU] Data tab "Absensi Hari Ini" di panel Karyawan Cuti (Dashboard HRD / Super Admin):
// karyawan yang sakit, terlambat, dan belum absen hari ini. Dimuat saat tab dibuka, lalu
// disegarkan berkala selama tab terbuka -- dan dijeda saat browser tab tersembunyi supaya hemat.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getTodayAttendanceSummary } from '../../../services/attendanceService';

const POLL_INTERVAL_MS = 60 * 1000;

export default function useTodayAttendanceSummary() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const isMountedRef = useRef(true);

  const load = useCallback(() => {
    return getTodayAttendanceSummary()
      .then((data) => {
        if (!isMountedRef.current) return;
        setSummary(data);
        setErrorMessage('');
      })
      .catch((error) => {
        console.error('Gagal memuat absensi hari ini:', error);
        if (isMountedRef.current) setErrorMessage('Gagal memuat data absensi hari ini.');
      })
      .finally(() => {
        if (isMountedRef.current) setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [load]);

  return { summary, isLoading, errorMessage, reload: load };
}
