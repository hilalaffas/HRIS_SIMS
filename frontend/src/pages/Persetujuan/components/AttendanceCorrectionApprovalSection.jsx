import React, { useMemo, useState } from 'react';
import ApprovalTable from '../../../components/ApprovalTable';
import Toast from '../../../components/Toast';
import './OvertimeApprovalSection.css';

export default function AttendanceCorrectionApprovalSection({ rows, loading, processingKey, toast, pendingCount, onDecision, padded = false }) {
  const [filter, setFilter] = useState('pending');
  const visibleRows = useMemo(
    () => filter === 'pending' ? rows.filter((row) => row.status === 'PENDING') : rows,
    [rows, filter],
  );
  return (
    <div className={`overtimeApprovalSection${padded ? ' overtimeApprovalSection--padded' : ''}`}>
      <div className="apv-filter" role="tablist" aria-label="Filter koreksi absensi">
        <button type="button" role="tab" aria-selected={filter === 'pending'} className={`apv-filter-button${filter === 'pending' ? ' is-active' : ''}`} onClick={() => setFilter('pending')}>
          Menunggu {pendingCount > 0 && <span className="apv-filter-count">{pendingCount}</span>}
        </button>
        <button type="button" role="tab" aria-selected={filter === 'all'} className={`apv-filter-button${filter === 'all' ? ' is-active' : ''}`} onClick={() => setFilter('all')}>Semua</button>
      </div>
      <ApprovalTable rows={visibleRows} loading={loading} processingKey={processingKey}
        emptyMessage={filter === 'pending' ? 'Tidak ada koreksi absensi yang menunggu.' : 'Belum ada pengajuan koreksi absensi.'}
        onDecision={onDecision} detailTitle="Detail Koreksi Absensi" />
      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
