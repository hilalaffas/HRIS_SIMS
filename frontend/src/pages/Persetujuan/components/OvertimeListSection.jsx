// src/pages/Persetujuan/components/OvertimeListSection.jsx
//
// [BARU] "List Lembur" -- menggantikan OvertimeApprovalSection (Persetujuan Lembur).
// Bentuknya meniru "List Cuti" (pages/Cuti/approve/components/ListSection.jsx): total data,
// Filter Status, tabel riwayat, dan tombol "Rincian" yang membuka popup
// "Informasi Detail Berkas Lembur" (components/OvertimeDetailModal.jsx).
//
// TIDAK ADA tombol ACC/Tolak di sini: semua proses ACC dilakukan di tab "Perlu Diproses".
// Data datang dari hooks/useOvertimeApprovals.js (murni tampilan).
//
// Gaya memakai class .leaveList__* / .statusBadge milik List Cuti (ListSection.css), jadi
// harus dirender di dalam wrapper .approve-leaving-page (sumber variabel --alv-*).
import React, { useMemo, useState } from 'react';
import FilterStatusDropdown from '../../Cuti/approve/components/FilterStatusDropdown';
import OvertimeDetailModal from '../../../components/OvertimeDetailModal';
import Toast from '../../../components/Toast';
import { formatDateLabel } from '../../../services/attendanceService';
import '../../Cuti/approve/components/ListSection.css';
import './OvertimeListSection.css';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'PROSES', label: 'Dalam Proses' },
  { value: 'DISETUJUI', label: 'Disetujui (ACC)' },
  { value: 'DITOLAK', label: 'Ditolak' },
];

// Status backend (PENDING / APPROVED / REJECTED) -> kode berkas yang sama dengan List Cuti
const BERKAS_BY_STATUS = { PENDING: 'PROSES', APPROVED: 'DISETUJUI', REJECTED: 'DITOLAK' };
const BADGE_CLASS = { PROSES: 'statusBadge--blue', DISETUJUI: 'statusBadge--green', DITOLAK: 'statusBadge--rose' };
const BADGE_LABEL = { PROSES: 'Proses', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' };

export default function OvertimeListSection({ rows, loading, toast }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [detailRow, setDetailRow] = useState(null);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'ALL') return rows;
    return rows.filter((row) => BERKAS_BY_STATUS[row.status] === statusFilter);
  }, [rows, statusFilter]);

  return (
    <div className="leaveList">
      <div className="leaveList__toolbar">
        <div className="leaveList__total">
          Total Riwayat: <strong>{filteredRows.length} Data</strong>
        </div>
        <FilterStatusDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
      </div>

      {loading ? (
        <div className="leaveList__empty">Memuat data...</div>
      ) : filteredRows.length === 0 ? (
        <div className="leaveList__empty">Belum ada riwayat lembur untuk status ini.</div>
      ) : (
        <div className="leaveList__table" role="table">
          <div className="leaveList__row leaveList__row--head" role="row">
            <div role="columnheader">Karyawan Pemohon</div>
            <div role="columnheader">Detail Lembur</div>
            <div role="columnheader">Keterangan</div>
            <div role="columnheader" className="leaveList__colStatus">Status Berkas</div>
            <div role="columnheader" className="leaveList__colLog">Log Detail</div>
          </div>

          {filteredRows.map((row) => {
            const berkasStatus = BERKAS_BY_STATUS[row.status] || 'PROSES';
            return (
              <div className="leaveList__row" role="row" key={row.rowKey}>
                <div role="cell">
                  <div className="leaveList__name">{row.employeeName}</div>
                </div>

                <div role="cell">
                  <div className="leaveList__type">{formatDateLabel(row.date)}</div>
                  <div className="leaveList__duration">{row.subDetail}</div>
                </div>

                <div role="cell">
                  <span className="overtimeList__reason">{row.detail}</span>
                </div>

                <div role="cell" className="leaveList__colStatus">
                  {/* .leaveList__colStatus berupa flex baris, jadi lencana + posisi tahap dibungkus kolom */}
                  <div className="overtimeList__status">
                    <span className={`statusBadge ${BADGE_CLASS[berkasStatus]}`}>{BADGE_LABEL[berkasStatus]}</span>
                    {/* Posisi tahap berjenjang, mis. "Menunggu Persetujuan SPV" */}
                    {berkasStatus === 'PROSES' && <span className="overtimeList__progress">{row.approvalProgressStatus}</span>}
                  </div>
                </div>

                <div role="cell" className="leaveList__colLog">
                  <button type="button" className="leaveList__detailsBtn" onClick={() => setDetailRow(row)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                    Rincian
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailRow && <OvertimeDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
