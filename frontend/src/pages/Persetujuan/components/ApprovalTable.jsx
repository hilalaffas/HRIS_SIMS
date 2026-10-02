// src/pages/Persetujuan/components/ApprovalTable.jsx
import React from 'react';
import { Paperclip } from 'lucide-react';
import { formatDateLabel } from '../../../services/attendanceService';
import './ApprovalTable.css';

const KIND_LABEL = { sakit: 'Izin Sakit', lembur: 'Lembur' };
const DECIDED_LABEL = { APPROVED: 'Disetujui', REJECTED: 'Ditolak' };

export default function ApprovalTable({ rows, loading, processingKey, emptyMessage, onDecision }) {
  return (
    <div className="apv-table-wrap">
      <table className="apv-table">
        <thead>
          <tr>
            <th>KARYAWAN</th>
            <th>TIPE PERMOHONAN</th>
            <th>TANGGAL</th>
            <th>DETAIL / ALASAN</th>
            <th className="apv-center">BUKTI LAMPIRAN</th>
            <th className="apv-center">AKSI KONFIRMASI</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={6} className="apv-empty-row">Memuat data...</td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={6} className="apv-empty-row">{emptyMessage}</td></tr>
          )}
          {!loading && rows.map((row) => {
            const isProcessing = processingKey === row.rowKey;
            const isPending = row.status === 'PENDING';
            return (
              <tr key={row.rowKey}>
                <td className="apv-name">{row.employeeName}</td>
                <td>
                  <span className={`apv-type apv-type-${row.kind}`}>{KIND_LABEL[row.kind]}</span>
                </td>
                <td className="apv-date">{formatDateLabel(row.date)}</td>
                <td>
                  {row.detail}
                  {row.subDetail && <span className="apv-subdetail">{row.subDetail}</span>}
                </td>
                <td className="apv-center">
                  {row.proofUrl ? (
                    <a className="apv-proof" href={row.proofUrl} target="_blank" rel="noreferrer">
                      <Paperclip aria-hidden="true" />
                      Foto Bukti
                    </a>
                  ) : (
                    <span className="apv-muted">-</span>
                  )}
                </td>
                <td className="apv-center">
                  {isPending ? (
                    <div className="apv-actions">
                      <button
                        type="button"
                        className="apv-btn apv-btn-approve"
                        disabled={isProcessing}
                        onClick={() => onDecision(row, 'APPROVED')}
                      >
                        Setujui
                      </button>
                      <button
                        type="button"
                        className="apv-btn apv-btn-reject"
                        disabled={isProcessing}
                        onClick={() => onDecision(row, 'REJECTED')}
                      >
                        Tolak
                      </button>
                    </div>
                  ) : (
                    <span className={`apv-decided apv-decided-${row.status.toLowerCase()}`}>
                      {DECIDED_LABEL[row.status] || row.status}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
