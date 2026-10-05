// src/components/ApprovalTable.jsx
//
// [UBAH] Dipindah ke components/ karena dipakai 2 halaman: Persetujuan Lembur
// (tanpa bukti) dan tab "Izin Sakit" di Persetujuan Cuti (dengan foto bukti).
import React from 'react';
import { Paperclip } from 'lucide-react';
import { formatDateLabel } from '../services/attendanceService';
import './ApprovalTable.css';

const DECIDED_LABEL = { APPROVED: 'Disetujui', REJECTED: 'Ditolak' };

// [UBAH] `showProof`: tampilkan kolom "Bukti Lampiran" (hanya untuk Izin Sakit).
export default function ApprovalTable({ rows, loading, processingKey, emptyMessage, onDecision, showProof = false }) {
  const columnCount = showProof ? 5 : 4;
  return (
    <div className="apv-table-wrap">
      <table className="apv-table">
        <thead>
          <tr>
            <th>KARYAWAN</th>
            <th>TANGGAL</th>
            <th>DETAIL / ALASAN</th>
            {showProof && <th className="apv-center">BUKTI LAMPIRAN</th>}
            <th className="apv-center">AKSI KONFIRMASI</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={columnCount} className="apv-empty-row">Memuat data...</td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={columnCount} className="apv-empty-row">{emptyMessage}</td></tr>
          )}
          {!loading && rows.map((row) => {
            const isProcessing = processingKey === row.rowKey;
            const isPending = row.status === 'PENDING';
            return (
              <tr key={row.rowKey}>
                <td className="apv-name">{row.employeeName}</td>
                <td className="apv-date">{formatDateLabel(row.date)}</td>
                <td>
                  {row.detail}
                  {row.subDetail && <span className="apv-subdetail">{row.subDetail}</span>}
                </td>
                {showProof && (
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
                )}
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
