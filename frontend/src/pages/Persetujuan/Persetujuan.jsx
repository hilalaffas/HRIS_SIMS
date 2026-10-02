// src/pages/Persetujuan/Persetujuan.jsx
//
// Halaman "Persetujuan Sakit & Lembur" (menu SuperAdmin). Menggabungkan dua
// sumber jadi satu tabel:
//   - Izin Sakit : absensi dengan reason SAKIT (services/attendanceService.js)
//   - Lembur     : Pengajuan Lembur (services/overtimeService.js)
// SEMENTARA hanya SuperAdmin yang bisa membuka halaman ini (route +
// SecurityConfig); akses HRD belum dikonfirmasi.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import Toast from '../../components/Toast';
import ApprovalTable from './components/ApprovalTable';
import { decideSickApproval, getSickApprovals } from '../../services/attendanceService';
import {
  decideOvertimeApproval,
  formatOvertimeDuration,
  getOvertimeApprovals,
} from '../../services/overtimeService';
import './Persetujuan.css';

const FILTERS = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'all', label: 'Semua' },
];

const clockLabel = (time) => (time ? String(time).slice(0, 5) : '-');

// Bentuk baris seragam untuk tabel (satu bentuk untuk Sakit & Lembur).
const toSickRow = (item) => ({
  rowKey: `sakit-${item.attendanceId}`,
  kind: 'sakit',
  id: item.attendanceId,
  employeeName: item.employeeName || '-',
  date: item.attendanceDate,
  detail: item.note || 'Sakit',
  subDetail: '',
  proofUrl: item.photoUrl || '',
  status: String(item.approvalStatus || '').toUpperCase(),
});

const toOvertimeRow = (item) => ({
  rowKey: `lembur-${item.overtimeId}`,
  kind: 'lembur',
  id: item.overtimeId,
  employeeName: item.employeeName || '-',
  date: item.overtimeDate,
  detail: item.reason || '-',
  subDetail: `${clockLabel(item.startTime)} - ${clockLabel(item.endTime)} (${formatOvertimeDuration(item.totalMinutes)})`,
  proofUrl: '',
  status: String(item.status || '').toUpperCase(),
});

// Menunggu paling atas, lalu tanggal terbaru.
const sortRows = (a, b) => {
  const pendingA = a.status === 'PENDING' ? 0 : 1;
  const pendingB = b.status === 'PENDING' ? 0 : 1;
  if (pendingA !== pendingB) return pendingA - pendingB;
  return a.date < b.date ? 1 : -1;
};

export default function Persetujuan() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingKey, setProcessingKey] = useState('');
  const [toast, setToast] = useState(null);
  // Gerbang sinkron anti klik ganda (state saja terlambat satu render).
  const processingLock = useRef(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSickApprovals(), getOvertimeApprovals()])
      .then(([sickData, overtimeData]) => {
        if (cancelled) return;
        setRows([
          ...(sickData || []).map(toSickRow),
          ...(overtimeData || []).map(toOvertimeRow),
        ].sort(sortRows));
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
  }, [showToast]);

  const pendingCount = useMemo(() => rows.filter((row) => row.status === 'PENDING').length, [rows]);
  const visibleRows = useMemo(
    () => (filter === 'pending' ? rows.filter((row) => row.status === 'PENDING') : rows),
    [rows, filter],
  );

  const handleDecision = async (row, status) => {
    if (processingLock.current) return;
    processingLock.current = true;
    setProcessingKey(row.rowKey);
    try {
      if (row.kind === 'sakit') {
        await decideSickApproval(row.id, status);
      } else {
        await decideOvertimeApproval(row.id, status);
      }
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
  };

  return (
    <div className="persetujuan-page">
      <section className="apv-card">
        <header className="apv-header">
          <div>
            <h1>
              <CircleCheck aria-hidden="true" />
              Persetujuan Sakit &amp; Lembur
            </h1>
            <p>Konfirmasi izin sakit dan pengajuan lembur karyawan.</p>
          </div>
          <span className="apv-area-badge">Area Persetujuan</span>
        </header>

        <div className="apv-filter" role="tablist" aria-label="Filter status">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              className={`apv-filter-button${filter === item.key ? ' is-active' : ''}`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              {item.key === 'pending' && pendingCount > 0 && (
                <span className="apv-filter-count">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <ApprovalTable
          rows={visibleRows}
          loading={loading}
          processingKey={processingKey}
          emptyMessage={filter === 'pending' ? 'Tidak ada pengajuan yang menunggu persetujuan.' : 'Belum ada pengajuan.'}
          onDecision={handleDecision}
        />
      </section>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
