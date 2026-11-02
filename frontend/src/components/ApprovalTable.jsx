// src/components/ApprovalTable.jsx
import React, { useState } from 'react';
import { Clock3, Paperclip } from 'lucide-react';
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

export default function ApprovalTable({ rows, loading, processingKey, emptyMessage, onDecision, showProof = false }) {
  const [detailRow, setDetailRow] = useState(null);
  const columnCount = showProof ? 6 : 5;
  return (
    <>
      <div className="apv-table-wrap">
        <table className="apv-table">
          <thead><tr>
            <th>KARYAWAN</th><th>TANGGAL</th><th>DETAIL / ALASAN</th>
            {showProof && <th className="apv-center">BUKTI LAMPIRAN</th>}
            <th>STATUS PERSETUJUAN</th><th className="apv-center">AKSI TINDAKAN</th>
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
                <td className="apv-center"><div className="apv-actions">
                  <button type="button" className="apv-btn apv-btn-approve" disabled={!canAct || isProcessing} title={!canAct ? 'Menunggu tahap approval sebelumnya' : 'Setujui'} onClick={() => onDecision(row, 'APPROVED')}>Setujui</button>
                  <button type="button" className="apv-btn apv-btn-reject" disabled={!canAct || isProcessing} title={!canAct ? 'Menunggu tahap approval sebelumnya' : 'Tolak'} onClick={() => onDecision(row, 'REJECTED')}>Tolak</button>
                  <button type="button" className="apv-detail-btn" title="Lihat detail lembur dan alur approval" aria-label="Lihat detail lembur" onClick={() => setDetailRow(row)}><Clock3 size={16} /></button>
                </div>{isPending && !canAct && <small className="apv-waiting-hint">Menunggu tahap sebelumnya / nama approval</small>}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {detailRow && <div className="apv-detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailRow(null); }}>
        <section className="apv-detail-modal" role="dialog" aria-modal="true" aria-labelledby="apv-detail-title">
          <header><h2 id="apv-detail-title">Detail Pengajuan Lembur</h2><button type="button" onClick={() => setDetailRow(null)} aria-label="Tutup">×</button></header>
          <dl><div><dt>Nama Karyawan</dt><dd>{detailRow.employeeName}</dd></div><div><dt>Tanggal</dt><dd>{formatDateLabel(detailRow.date)}</dd></div><div><dt>Jam</dt><dd>{detailRow.subDetail || '-'}</dd></div><div><dt>Alasan</dt><dd>{detailRow.detail || '-'}</dd></div><div><dt>Status</dt><dd><span className={`apv-status ${badgeClass(detailRow.approvalProgressStatus)}`}>{detailRow.approvalProgressStatus}</span></dd></div></dl>
          <h3>Riwayat Approval</h3>
          {detailRow.approvals?.length ? <ol className="apv-timeline">{detailRow.approvals.map((step, index) => <li key={`${step.role}-${step.employeeId}-${index}`}><strong>{step.role}</strong><span>{step.employeeName || '-'}</span><em className={`apv-step-${String(step.action || 'PENDING').toLowerCase()}`}>{step.action === 'APPROVED' ? 'Disetujui' : step.action === 'REJECTED' ? 'Ditolak' : 'Menunggu'}</em>{step.actedAt && <small>{new Date(step.actedAt).toLocaleString('id-ID')}</small>}{step.note && <small>Catatan: {step.note}</small>}</li>)}</ol> : <p className="apv-muted">Nama approval belum dilengkapi.</p>}
          <footer><button type="button" onClick={() => setDetailRow(null)}>Tutup</button></footer>
        </section>
      </div>}
    </>
  );
}
