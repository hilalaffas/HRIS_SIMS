// src/hooks/useOvertimeApprovals.js
//
// [BARU] Logika data Persetujuan Lembur (muat, urutkan, setujui/tolak) dipisah
// dari tampilan supaya bisa dipakai dua tempat: Pusat Persetujuan (Leader/SPV/Manager:
// ACC di tab "Perlu Diproses", daftar di tab "List Lembur") dan halaman /persetujuan
// (SuperAdmin: "List Lembur", hanya lihat).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  decideOvertimeApproval,
  formatOvertimeDuration,
  getOvertimeApprovals,
} from '../services/overtimeService';

const clockLabel = (time) => (time ? String(time).slice(0, 5) : '-');

// Bentuk baris untuk tabel persetujuan.
const getProgressStatus = (item) => {
  const approvals = item.approvals || [];
  const pending = approvals.find((step) => step.action === 'PENDING');
  if (pending) return `Menunggu Persetujuan ${pending.role}`;
  if (String(item.status).toUpperCase() === 'APPROVED') return 'Sudah Di-ACC';
  if (String(item.status).toUpperCase() === 'REJECTED') return 'Ditolak';
  return approvals.length ? 'Dalam Proses Persetujuan' : 'Menunggu tahap sebelumnya / nama approval';
};

const toOvertimeRow = (item) => ({
  rowKey: `lembur-${item.overtimeId}`,
  id: item.overtimeId,
  employeeName: item.employeeName || '-',
  date: item.overtimeDate,
  detail: item.reason || '-',
  subDetail: `${clockLabel(item.startTime)} - ${clockLabel(item.endTime)} (${formatOvertimeDuration(item.totalMinutes)})`,
  status: String(item.status || '').toUpperCase(),
  canAct: Boolean(item.canAct),
  approvalProgressStatus: getProgressStatus(item),
  approvals: item.approvals || [],
  totalMinutes: item.totalMinutes,
  employeeId: item.employeeId,
  // [BARU] Dipakai popup detail berkas lembur (OvertimeDetailModal)
  startTime: clockLabel(item.startTime),
  endTime: clockLabel(item.endTime),
  createdAt: item.createdAt,
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
      // [UBAH] Pakai respons server sebagai sumber kebenaran. Sebelumnya baris langsung
      // ditandai APPROVED / "Sudah Di-ACC" padahal ACC berjenjang (Leader -> SPV -> Manager)
      // baru selesai setelah SEMUA tahap setuju -- jadi satu klik ACC Leader terlihat
      // seolah pengajuan sudah final.
      const updated = await decideOvertimeApproval(row.id, status);
      // Baris diganti data terbaru; canAct dari server null -> false, jadi pengajuan
      // otomatis keluar dari antrean "Perlu Diproses" approver ini.
      setRows((current) => current
        .map((item) => (item.rowKey === row.rowKey ? toOvertimeRow(updated) : item))
        .sort(sortRows));
      const isFinalApproved = String(updated?.status || '').toUpperCase() === 'APPROVED';
      showToast(
        status === 'REJECTED' ? 'Pengajuan ditolak.'
          : isFinalApproved ? 'Pengajuan disetujui.'
            : 'Disetujui pada tahap Anda. Pengajuan diteruskan ke approver berikutnya.',
      );
    } catch (error) {
      showToast(error?.message || 'Gagal memproses pengajuan.', 'error');
    } finally {
      processingLock.current = false;
      setProcessingKey('');
    }
  }, [showToast]);

  return { rows, loading, processingKey, toast, pendingCount, handleDecision };
}
