// src/hooks/useOvertimeApprovals.js
//
// [BARU] Logika data Persetujuan Lembur (muat, urutkan, setujui/tolak) dipisah
// dari tampilan supaya bisa dipakai dua tempat: tab "Persetujuan Lembur" di
// Pusat Persetujuan (Leader/SPV/Manager) dan halaman /persetujuan (SuperAdmin).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  decideOvertimeApproval,
  formatOvertimeDuration,
  getOvertimeApprovals,
} from '../services/overtimeService';

const clockLabel = (time) => (time ? String(time).slice(0, 5) : '-');

// Bentuk baris untuk tabel persetujuan.
const toOvertimeRow = (item) => ({
  rowKey: `lembur-${item.overtimeId}`,
  id: item.overtimeId,
  employeeName: item.employeeName || '-',
  date: item.overtimeDate,
  detail: item.reason || '-',
  subDetail: `${clockLabel(item.startTime)} - ${clockLabel(item.endTime)} (${formatOvertimeDuration(item.totalMinutes)})`,
  status: String(item.status || '').toUpperCase(),
});

// Menunggu paling atas, lalu tanggal terbaru.
const sortRows = (a, b) => {
  const pendingA = a.status === 'PENDING' ? 0 : 1;
  const pendingB = b.status === 'PENDING' ? 0 : 1;
  if (pendingA !== pendingB) return pendingA - pendingB;
  return a.date < b.date ? 1 : -1;
};

/**
 * @param {boolean} enabled - false = jangan memanggil API sama sekali
 *   (dipakai untuk role yang tidak berhak, supaya tidak kena 403).
 */
export default function useOvertimeApprovals(enabled = true) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [processingKey, setProcessingKey] = useState('');
  const [toast, setToast] = useState(null);
  // Gerbang sinkron anti klik ganda (state saja terlambat satu render).
  const processingLock = useRef(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    getOvertimeApprovals()
      .then((data) => {
        if (!cancelled) setRows((data || []).map(toOvertimeRow).sort(sortRows));
      })
      .catch((error) => {
        if (!cancelled) showToast(error?.message || 'Gagal memuat data persetujuan.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, showToast]);

  const pendingCount = useMemo(
    () => rows.filter((row) => row.status === 'PENDING').length,
    [rows],
  );

  const handleDecision = useCallback(async (row, status) => {
    if (processingLock.current) return;
    processingLock.current = true;
    setProcessingKey(row.rowKey);
    try {
      await decideOvertimeApproval(row.id, status);
      // Baris tetap ada di daftar "Semua" dengan status baru; di filter
      // "Menunggu" otomatis hilang karena bukan PENDING lagi.
      setRows((current) => current
        .map((item) => (item.rowKey === row.rowKey ? { ...item, status } : item))
        .sort(sortRows));
      showToast(status === 'APPROVED' ? 'Pengajuan disetujui.' : 'Pengajuan ditolak.');
    } catch (error) {
      showToast(error?.message || 'Gagal memproses pengajuan.', 'error');
    } finally {
      processingLock.current = false;
      setProcessingKey('');
    }
  }, [showToast]);

  return { rows, loading, processingKey, toast, pendingCount, handleDecision };
}
