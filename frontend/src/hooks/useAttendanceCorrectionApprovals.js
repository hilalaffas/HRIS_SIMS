import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { decideCorrectionApproval, getCorrectionApprovals } from '../services/attendanceCorrectionService';

function toRow(item) {
  const steps = item.approvals || [];
  const current = steps.find((step) => step.action === 'PENDING');
  return {
    rowKey: `correction-${item.correctionId}`,
    id: item.correctionId,
    employeeName: item.employeeName || '-',
    date: item.attendanceDate,
    detail: item.reason || '-',
    subDetail: 'Koreksi keterlambatan absensi',
    status: String(item.status || '').toUpperCase(),
    canAct: Boolean(item.canAct),
    approvalProgressStatus: current ? `Menunggu Persetujuan ${current.role}` :
      item.status === 'APPROVED' ? 'Sudah Di-ACC' : item.status === 'REJECTED' ? 'Ditolak' : 'Dalam Proses Persetujuan',
    approvals: steps,
  };
}

const sortRows = (a, b) => {
  const pa = a.status === 'PENDING' ? 0 : 1;
  const pb = b.status === 'PENDING' ? 0 : 1;
  return pa - pb || (a.date < b.date ? 1 : -1);
};

export default function useAttendanceCorrectionApprovals(enabled = true) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [processingKey, setProcessingKey] = useState('');
  const [toast, setToast] = useState(null);
  const lock = useRef(false);

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await getCorrectionApprovals();
      setRows((data || []).map(toRow).sort(sortRows));
    } catch (error) {
      showToast(error?.message || 'Gagal memuat persetujuan koreksi absensi.', 'error');
    } finally { setLoading(false); }
  }, [enabled, showToast]);

  // [UBAH] Muat awal dilakukan di dalam effect (setelah await) agar tidak memicu
  // lint react-hooks/set-state-in-effect; `load` tetap dipakai untuk muat ulang manual.
  useEffect(() => {
    if (!enabled) return undefined;
    let isActive = true;
    (async () => {
      try {
        const data = await getCorrectionApprovals();
        if (isActive) setRows((data || []).map(toRow).sort(sortRows));
      } catch (error) {
        if (isActive) showToast(error?.message || 'Gagal memuat persetujuan koreksi absensi.', 'error');
      } finally {
        if (isActive) setLoading(false);
      }
    })();
    return () => { isActive = false; };
  }, [enabled, showToast]);

  const pendingCount = useMemo(() => rows.filter((row) => row.status === 'PENDING').length, [rows]);

  const handleDecision = useCallback(async (row, status) => {
    if (lock.current) return;
    lock.current = true; setProcessingKey(row.rowKey);
    try {
      const updated = await decideCorrectionApproval(row.id, status);
      setRows((current) => current.map((item) => item.id === row.id ? toRow(updated) : item).sort(sortRows));
      showToast(status === 'APPROVED' ? 'Koreksi absensi disetujui.' : 'Koreksi absensi ditolak.');
    } catch (error) { showToast(error?.message || 'Gagal memproses koreksi.', 'error'); }
    finally { lock.current = false; setProcessingKey(''); }
  }, [showToast]);

  return { rows, loading, processingKey, toast, pendingCount, handleDecision, reload: load };
}
