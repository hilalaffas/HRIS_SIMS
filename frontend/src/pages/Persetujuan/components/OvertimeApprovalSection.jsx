// src/pages/Persetujuan/components/OvertimeApprovalSection.jsx
//
// [BARU] Isi "Persetujuan Lembur": filter Menunggu/Semua + tabel persetujuan.
// Murni tampilan -- data & aksi datang dari hooks/useOvertimeApprovals.js.
import React, { useMemo, useState } from 'react';
import ApprovalTable from '../../../components/ApprovalTable';
import Toast from '../../../components/Toast';
import './OvertimeApprovalSection.css';

const FILTERS = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'all', label: 'Semua' },
];

export default function OvertimeApprovalSection({
  rows,
  loading,
  processingKey,
  toast,
  pendingCount,
  onDecision,
  padded = false, // true = dipakai sebagai tab (butuh jarak dalam sendiri)
}) {
  const [filter, setFilter] = useState('pending');

  const visibleRows = useMemo(
    () => (filter === 'pending' ? rows.filter((row) => row.status === 'PENDING') : rows),
    [rows, filter],
  );

  return (
    <div className={`overtimeApprovalSection${padded ? ' overtimeApprovalSection--padded' : ''}`}>
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
        onDecision={onDecision}
      />

      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
