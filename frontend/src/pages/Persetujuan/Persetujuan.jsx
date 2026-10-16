// src/pages/Persetujuan/Persetujuan.jsx
//
// [UBAH] Halaman "Persetujuan Lembur" khusus SuperAdmin (semua divisi).
// Leader/SPV/Manager memakai tab "Persetujuan Lembur" di Pusat Persetujuan
// (pages/Cuti/approve/ApproveLeave.jsx). Data & aksi ada di
// hooks/useOvertimeApprovals.js, tampilan di components/OvertimeApprovalSection.jsx.
import React from 'react';
import { CircleCheck } from 'lucide-react';
import useOvertimeApprovals from '../../hooks/useOvertimeApprovals';
import OvertimeApprovalSection from './components/OvertimeApprovalSection';
import './Persetujuan.css';

export default function Persetujuan() {
  const overtime = useOvertimeApprovals();

  return (
    <div className="persetujuan-page">
      <section className="apv-card">
        <header className="apv-header">
          <div>
            <h1>
              <CircleCheck aria-hidden="true" />
              Persetujuan Lembur
            </h1>
            <p>Konfirmasi pengajuan lembur karyawan.</p>
          </div>
          <span className="apv-area-badge">Area Persetujuan</span>
        </header>

        <OvertimeApprovalSection
          rows={overtime.rows}
          loading={overtime.loading}
          processingKey={overtime.processingKey}
          toast={overtime.toast}
          pendingCount={overtime.pendingCount}
          onDecision={overtime.handleDecision}
        />
      </section>
    </div>
  );
}
