// src/pages/PersetujuanIzin/PersetujuanIzin.jsx
//
// [BARU] Halaman "Persetujuan Surat Sakit & Izin" untuk Leader / SPV / Manager.
// Verifikasi surat dokter & bukti izin bawahan (satu divisi) sebelum dicatat ke
// rekap absensi. Halaman ini hanya MERAKIT: data & aksi di
// hooks/usePermissionApprovals.js, logika murni di utils/permissionRequest.js,
// tampilan di components/.
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, FilePlus2, MousePointerClick } from 'lucide-react';
import Toast from '../../components/Toast';
import usePermissionApprovals from '../../hooks/usePermissionApprovals';
import ApprovalStatCards from './components/ApprovalStatCards';
import ApprovalToolbar from './components/ApprovalToolbar';
import BulkApproveModal from './components/BulkApproveModal';
import RequestDetail from './components/RequestDetail';
import RequestList from './components/RequestList';
import StatusTabs from './components/StatusTabs';
import { STATUS_TABS, matchesFilters } from './utils/permissionRequest';
import './PersetujuanIzin.css';

const LEAVE_ANIMATION_MS = 320; // sinkron dengan --motion-slow (animasi baris keluar)

const EMPTY_MESSAGES = {
  PENDING: 'Tidak ada pengajuan yang menunggu persetujuan.',
  APPROVED: 'Belum ada pengajuan yang disetujui.',
  REJECTED: 'Belum ada pengajuan yang ditolak.',
};

export default function PersetujuanIzin() {
  const {
    rows, loading, loadError, stats, toast, processingIds, bulkRunning, decide, approveMany,
  } = usePermissionApprovals(true);

  const [tab, setTab] = useState('PENDING');
  const [type, setType] = useState('ALL');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const detailRef = useRef(null);
  const leaveTimer = useRef(null);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const deferredQuery = useDeferredValue(query);

  // Baris yang baru diputuskan tetap tampil sebentar (leavingId) supaya sempat
  // memutar animasi keluar sebelum hilang dari tab "Menunggu".
  const visibleRows = useMemo(
    () => rows.filter((row) => (row.status === tab || row.id === leavingId)
      && matchesFilters(row, { type, query: deferredQuery })),
    [rows, tab, type, deferredQuery, leavingId],
  );

  const selected = visibleRows.find((row) => row.id === selectedId) ?? visibleRows[0] ?? null;

  // ACC massal: hanya yang menunggu, berlampiran, dan sesuai filter yang sedang tampil.
  const bulkTargets = useMemo(
    () => rows.filter((row) => row.status === 'PENDING' && row.attachment
      && matchesFilters(row, { type, query: deferredQuery })),
    [rows, type, deferredQuery],
  );

  const handleTabChange = useCallback((key) => {
    window.clearTimeout(leaveTimer.current);
    setLeavingId(null);
    setTab(key);
  }, []);

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
    // Layar sempit: panel detail ada di bawah daftar -> gulir ke sana.
    if (window.matchMedia('(max-width: 900px)').matches) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const startLeaving = useCallback((row) => {
    window.clearTimeout(leaveTimer.current);
    setLeavingId(row.id);
    leaveTimer.current = window.setTimeout(() => setLeavingId(null), LEAVE_ANIMATION_MS);
  }, []);

  const handleDecision = useCallback(
    (row, status, note) => decide(row, status, note, { onApplied: tab === 'PENDING' ? startLeaving : undefined }),
    [decide, tab, startLeaving],
  );

  const handleBulkConfirm = async () => {
    await approveMany(bulkTargets);
    setBulkOpen(false);
  };

  return (
    <div className="pzn-page">
      <header className="pzn-header">
        <div>
          <h1>
            <FilePlus2 aria-hidden="true" />
            Persetujuan Surat Sakit &amp; Izin
          </h1>
          <p>Verifikasi surat dokter dan bukti izin karyawan sebelum dicatat ke rekap absensi.</p>
        </div>
        <button
          type="button"
          className="pzn-bulk-btn"
          disabled={bulkTargets.length === 0 || bulkRunning}
          title={bulkTargets.length === 0 ? 'Tidak ada pengajuan menunggu yang berlampiran' : undefined}
          onClick={() => setBulkOpen(true)}
        >
          <CheckCheck aria-hidden="true" />
          ACC Semua Berlampiran
        </button>
      </header>

      <ApprovalStatCards stats={stats} />

      <section className="pzn-panel">
        <div className="pzn-panel__bar">
          <StatusTabs tabs={STATUS_TABS} activeKey={tab} pendingCount={stats.pending} onChange={handleTabChange} />
          <ApprovalToolbar type={type} query={query} onTypeChange={setType} onQueryChange={setQuery} />
        </div>

        <div className="pzn-panel__body">
          <div className="pzn-panel__list">
            <RequestList
              rows={visibleRows}
              selectedId={selected?.id}
              leavingId={leavingId}
              loading={loading}
              loadError={loadError}
              emptyMessage={deferredQuery || type !== 'ALL' ? 'Tidak ada pengajuan yang cocok dengan filter.' : EMPTY_MESSAGES[tab]}
              onSelect={handleSelect}
            />
          </div>

          <div className="pzn-panel__detail" ref={detailRef}>
            {selected ? (
              <RequestDetail
                key={selected.id}
                row={selected}
                processing={processingIds.has(selected.id)}
                onApprove={(row, note) => handleDecision(row, 'APPROVED', note)}
                onReject={(row, note) => handleDecision(row, 'REJECTED', note)}
              />
            ) : (
              <div className="pzn-detail-empty">
                <MousePointerClick aria-hidden="true" />
                <p>Pilih pengajuan di daftar untuk melihat detail dan buktinya.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {bulkOpen && (
        <BulkApproveModal
          count={bulkTargets.length}
          running={bulkRunning}
          onConfirm={handleBulkConfirm}
          onCancel={() => setBulkOpen(false)}
        />
      )}

      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
