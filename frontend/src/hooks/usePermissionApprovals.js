// src/hooks/usePermissionApprovals.js
//
// [BARU] Data & aksi Persetujuan Surat Sakit & Izin (muat, polling, setujui,
// tolak, setujui massal). Dipisah dari tampilan, mengikuti pola
// hooks/useOvertimeApprovals.js. Penyaringan/pemilihan baris (state tampilan)
// ada di pages/PersetujuanIzin/PersetujuanIzin.jsx.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { decideSickApproval, getSickApprovals } from '../services/attendanceService';
import {
  isProcessedThisMonth,
  sortRows,
  toPermissionRow,
} from '../pages/PersetujuanIzin/utils/permissionRequest';

const POLL_INTERVAL_MS = 60000;
const TOAST_MS = 3500;

/**
 * @param {boolean} enabled - false = jangan memanggil API sama sekali
 *   (role yang tidak berhak, supaya tidak kena 403).
 */
export default function usePermissionApprovals(enabled = true) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [loadError, setLoadError] = useState('');
  const [processingIds, setProcessingIds] = useState(() => new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [toast, setToast] = useState(null);

  // Gerbang sinkron anti klik ganda (state saja terlambat satu render).
  const busyRef = useRef(new Set());
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const run = (silent) => getSickApprovals(silent ? { silent: true } : {})
      .then((data) => {
        if (cancelled) return;
        setRows((data || []).map(toPermissionRow).sort(sortRows));
        setLoadError('');
      })
      .catch((error) => {
        // Polling latar belakang yang gagal tidak mengganggu layar.
        if (!cancelled && !silent) setLoadError(error?.message || 'Gagal memuat data persetujuan.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    run(false);
    const intervalId = window.setInterval(() => {
      if (!document.hidden) run(true);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  const markProcessing = (id, on) => {
    if (on) busyRef.current.add(id); else busyRef.current.delete(id);
    setProcessingIds(new Set(busyRef.current));
  };

  // Satu keputusan. `onApplied(row)` dipanggil tepat sebelum daftar diperbarui. Mengembalikan true bila berhasil. Baris diganti dengan
  // response backend (status + catatan + waktu keputusan terbaru).
  const decide = useCallback(async (row, status, note = '', { quiet = false, onApplied } = {}) => {
    if (busyRef.current.has(row.id)) return false;
    markProcessing(row.id, true);
    try {
      const updated = await decideSickApproval(row.id, status, note);
      const nextRow = toPermissionRow(updated);
      // Dipanggil di tick yang sama dengan setRows supaya React menggabungkannya jadi satu render
      // (dipakai halaman untuk memulai animasi keluar tanpa kedipan).
      onApplied?.(row);
      setRows((current) => current
        .map((item) => (item.id === row.id ? { ...item, ...nextRow, division: nextRow.division !== '-' ? nextRow.division : item.division } : item))
        .sort(sortRows));
      if (!quiet) {
        showToast(status === 'APPROVED' ? 'Pengajuan disetujui.' : 'Pengajuan ditolak.');
      }
      return true;
    } catch (error) {
      if (!quiet) showToast(error?.message || 'Gagal memproses pengajuan.', 'error');
      return false;
    } finally {
      markProcessing(row.id, false);
    }
  }, [showToast]);

  // "ACC Semua Berlampiran": berurutan (bukan paralel) supaya hasil tiap baris
  // jelas dan beban server ringan; satu gagal tidak menghentikan yang lain.
  const approveMany = useCallback(async (targets) => {
    if (bulkRunning || targets.length === 0) return { success: 0, failed: 0 };
    setBulkRunning(true);
    let success = 0;
    let failed = 0;
    for (const target of targets) {
      const ok = await decide(target, 'APPROVED', '', { quiet: true });
      if (ok) success += 1; else failed += 1;
    }
    setBulkRunning(false);
    if (failed === 0) showToast(`${success} pengajuan berlampiran disetujui.`);
    else showToast(`${success} disetujui, ${failed} gagal diproses.`, 'error');
    return { success, failed };
  }, [bulkRunning, decide, showToast]);

  const stats = useMemo(() => {
    const pending = rows.filter((row) => row.status === 'PENDING');
    return {
      pending: pending.length,
      sick: pending.filter((row) => row.type === 'SAKIT').length,
      other: pending.filter((row) => row.type !== 'SAKIT').length,
      processedThisMonth: rows.filter((row) => isProcessedThisMonth(row)).length,
    };
  }, [rows]);

  return {
    rows,
    loading,
    loadError,
    stats,
    toast,
    processingIds,
    bulkRunning,
    decide,
    approveMany,
  };
}
