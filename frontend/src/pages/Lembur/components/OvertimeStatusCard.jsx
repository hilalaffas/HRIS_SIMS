// src/pages/Lembur/components/OvertimeStatusCard.jsx
//
// [UBAH] Sebelumnya kartu ini berisi seluruh markup + ikon + logika status.
// Sekarang hanya adapter tipis: data lembur -> model (utils/approvalCardModels.js)
// -> tampilan generik components/ApprovalStatusCard.jsx, yang juga dipakai kartu
// cuti & izin sakit di halaman Pengajuan. Tampilan halaman Lembur tidak berubah.
import React from 'react';
import ApprovalStatusCard from '../../../components/ApprovalStatusCard';
import { buildOvertimeCardModel } from '../../../utils/approvalCardModels';

function OvertimeStatusCard({ record, isLatest = false, onCancel, onClose }) {
  return (
    <ApprovalStatusCard
      model={buildOvertimeCardModel(record, { isLatest })}
      onCancel={onCancel ? () => onCancel(record) : undefined}
      onClose={onClose}
    />
  );
}

export default OvertimeStatusCard;
