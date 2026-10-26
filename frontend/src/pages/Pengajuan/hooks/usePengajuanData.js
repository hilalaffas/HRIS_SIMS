// src/pages/Pengajuan/hooks/usePengajuanData.js
//
// Memuat data pengajuan yang BUKAN cuti (cuti dimuat useLeaveApplication):
// riwayat lembur + riwayat absensi (sumber izin sakit & izin terlambat),
// plus sinkronisasi latar belakang tiap 15 detik -- interval yang sama
// dengan halaman Cuti. Pemuatan ulang berkala bersifat "silent" (tanpa
// LoadingScreen global).
//
// Contoh pemakaian:
// const { overtimeRecords, attendanceRecords, loading, reload, upsertAttendance } = usePengajuanData(showToast);
import { useCallback, useEffect, useState } from 'react';
import { getMyAttendanceHistory, toDisplayRecord } from '../../../services/attendanceService';
import { getMyOvertime, toDisplayOvertime } from '../../../services/overtimeService';

const SYNC_INTERVAL_MS = 15000;

const fetchAll = (silent) => Promise.allSettled([
  getMyOvertime({ silent }),
  getMyAttendanceHistory({ silent }),
]);

export default function usePengajuanData(onError) {
  const [overtimeRecords, setOvertimeRecords] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hasil kedua request diterapkan lewat satu fungsi; kegagalan salah satu
  // tidak menggagalkan yang lain.
  const applyResults = useCallback(([overtimeResult, attendanceResult], silent) => {
    if (overtimeResult.status === 'fulfilled') {
      setOvertimeRecords((overtimeResult.value || []).map(toDisplayOvertime));
    }
    if (attendanceResult.status === 'fulfilled') {
      setAttendanceRecords((attendanceResult.value || []).map(toDisplayRecord));
    }
    // Error polling latar belakang sengaja didiamkan; hanya muat awal yang dilaporkan.
    const failed = [overtimeResult, attendanceResult].find((result) => result.status === 'rejected');
    if (failed && !silent && onError) onError(failed.reason?.message || 'Gagal memuat riwayat pengajuan.');
    setLoading(false);
  }, [onError]);

  const reload = useCallback(
    () => fetchAll(true).then((results) => applyResults(results, true)),
    [applyResults],
  );

  useEffect(() => {
    let cancelled = false;
    fetchAll(false).then((results) => {
      if (!cancelled) applyResults(results, false);
    });

    const syncInBackground = () => {
      fetchAll(true).then((results) => {
        if (!cancelled) applyResults(results, true);
      });
    };
    const intervalId = window.setInterval(syncInBackground, SYNC_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncInBackground();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [applyResults]);

  // Pembaruan langsung setelah kirim pengajuan / unggah surat, tanpa menunggu polling.
  const upsertAttendance = useCallback((record) => {
    setAttendanceRecords((current) => (
      current.some((entry) => entry.id === record.id)
        ? current.map((entry) => (entry.id === record.id ? record : entry))
        : [record, ...current]
    ));
  }, []);

  return {
    overtimeRecords,
    attendanceRecords,
    loading,
    reload,
    upsertAttendance,
  };
}
