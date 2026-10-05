// src/pages/Cuti/approve/components/SickApprovalSection.jsx
//
// [BARU] Tab "Izin Sakit" di Pusat Persetujuan Cuti (Leader, SPV, Manager).
// Data & aksi dikelola ApproveLeave.jsx; komponen ini hanya menyusun baris
// dan memakai tabel bersama components/ApprovalTable.jsx.
import React, { useMemo } from 'react';
import ApprovalTable from '../../../../components/ApprovalTable';
import './SickApprovalSection.css';

const toSickRow = (item) => ({
  rowKey: `sakit-${item.attendanceId}`,
  id: item.attendanceId,
  employeeName: item.employeeName || '-',
  date: item.attendanceDate,
  detail: item.note || 'Sakit',
  proofUrl: item.photoUrl || '',
  status: String(item.approvalStatus || '').toUpperCase(),
});

// Menunggu paling atas, lalu tanggal terbaru.
const sortRows = (a, b) => {
  const pendingA = a.status === 'PENDING' ? 0 : 1;
  const pendingB = b.status === 'PENDING' ? 0 : 1;
  if (pendingA !== pendingB) return pendingA - pendingB;
  return a.date < b.date ? 1 : -1;
};

const SickApprovalSection = ({ items, loading, processingKey, onDecision }) => {
  const rows = useMemo(() => items.map(toSickRow).sort(sortRows), [items]);

  return (
    <div className="sickApprovalSection">
      <ApprovalTable
        rows={rows}
        loading={loading}
        processingKey={processingKey}
        emptyMessage="Belum ada pengajuan izin sakit."
        onDecision={onDecision}
        showProof
      />
    </div>
  );
};

export default SickApprovalSection;
