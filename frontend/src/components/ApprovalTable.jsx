// src/components/ApprovalTable.jsx
import React from 'react';
import { Paperclip } from 'lucide-react';
import { formatDateLabel } from '../services/attendanceService';
import './ApprovalTable.css';
import { toSafeHttpUrl } from '../utils/safeUrl';

const badgeClass = (status) => {
  const value = String(status || '').toUpperCase();
  if (value.includes('DITOLAK')) return 'apv-status--rose';
  if (value.includes('REVISI') || value.includes('DIKEMBALIKAN')) return 'apv-status--amber';
  if (value.includes('ACC') || value.includes('DISETUJUI')) return 'apv-status--green';
  return 'apv-status--blue';
};

// [UBAH] + readOnly: tanpa tombol Setujui/Tolak (hanya "Rincian"). Dipakai tab "List ..." karena semua ACC
// sekarang dilakukan di tab "Perlu Diproses".
// [UBAH] onOpenDetail: callback tombol "Rincian" (membuka OvertimeDetailModal / AttendanceCorrectionDetailModal,
// desain sama dengan popup List Cuti). Popup bawaan tabel ini (.apv-detail-modal) DIHAPUS; tanpa onOpenDetail
// tombol Rincian tidak ditampilkan.
// [UBAH] Tombol detail kini bertuliskan "Rincian" dengan ikon mata yang sama seperti List Cuti.
export default function ApprovalTable({ rows, loading, processingKey, emptyMessage, onDecision, showProof = false, readOnly = false, onOpenDetail = null }) {
  const columnCount = showProof ? 6 : 5;
  return (
      <div className="apv-table-wrap">
        <table className="apv-table">
          <thead><tr>
            <th>KARYAWAN</th><th>TANGGAL</th><th>DETAIL / ALASAN</th>
            {showProof && <th className="apv-center">BUKTI LAMPIRAN</th>}
            <th>STATUS PERSETUJUAN</th><th className="apv-center apv-col-action">{readOnly ? 'LOG DETAIL' : 'AKSI TINDAKAN'}</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={columnCount} className="apv-empty-row">Memuat data...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={columnCount} className="apv-empty-row">{emptyMessage}</td></tr>}
            {!loading && rows.map((row) => {
              const isProcessing = processingKey === row.rowKey;
              const isPending = row.status === 'PENDING';
              const canAct = isPending && row.canAct;
              return <tr key={row.rowKey}>
                <td className="apv-name">{row.employeeName}</td>
                <td className="apv-date">{formatDateLabel(row.date)}</td>
                <td>{row.detail}{row.subDetail && <span className="apv-subdetail">{row.subDetail}</span>}</td>
                {showProof && <td className="apv-center">{toSafeHttpUrl(row.proofUrl) ? <a className="apv-proof" href={toSafeHttpUrl(row.proofUrl)} target="_blank" rel="noreferrer"><Paperclip aria-hidden="true" /> Foto Bukti</a> : <span className="apv-muted">-</span>}</td>}
                <td><span className={`apv-status ${badgeClass(row.approvalProgressStatus)}`}>{row.approvalProgressStatus || 'Dalam proses persetujuan'}</span></td>
                <td className="apv-center apv-col-action">
                  <div className="apv-actions">
                    {/* [UBAH] Tombol ACC disembunyikan di mode readOnly (ACC hanya di "Perlu Diproses") */}
                    {!readOnly && <>
                      <button type="button" className="apv-btn apv-btn-approve" disabled={!canAct || isProcessing} title={!canAct ? 'Menunggu tahap approval sebelumnya' : 'Setujui'} onClick={() => onDecision(row, 'APPROVED')}>Setujui</button>
                      <button type="button" className="apv-btn apv-btn-reject" disabled={!canAct || isProcessing} title={!canAct ? 'Menunggu tahap approval sebelumnya' : 'Tolak'} onClick={() => onDecision(row, 'REJECTED')}>Tolak</button>
                    </>}
                    {onOpenDetail && (
                      <button type="button" className="apv-detail-btn" title="Lihat rincian dan alur approval" onClick={() => onOpenDetail(row)}>
                        {/* Ikon mata: sama persis dengan tombol Rincian di List Cuti (ListSection.jsx) */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                        Rincian
                      </button>
                    )}
                  </div>
                  {!readOnly && isPending && !canAct && <small className="apv-waiting-hint">Menunggu tahap sebelumnya / nama approval</small>}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
  );
}
