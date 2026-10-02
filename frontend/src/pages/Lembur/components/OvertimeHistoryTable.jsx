// src/pages/Lembur/components/OvertimeHistoryTable.jsx
import React from 'react';
import { formatDateLabel } from '../../../services/attendanceService';
import { getOvertimeStatus } from '../../../services/overtimeService';
import './OvertimeHistoryTable.css';

export default function OvertimeHistoryTable({ records, loading }) {
  return (
    <section className="lmb-table-card">
      <h2>RIWAYAT PENGAJUAN LEMBUR SAYA</h2>

      <div className="lmb-table-wrap">
        <table className="lmb-table">
          <thead>
            <tr>
              <th>NO</th>
              <th>TANGGAL LEMBUR</th>
              <th>JAM MULAI</th>
              <th>JAM SELESAI</th>
              <th>TOTAL JAM</th>
              <th>ALASAN / PEKERJAAN LEMBUR</th>
              <th className="lmb-center">STATUS ACC</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="lmb-empty-row">Memuat data...</td></tr>
            )}
            {!loading && records.length === 0 && (
              <tr><td colSpan={7} className="lmb-empty-row">Belum ada pengajuan lembur.</td></tr>
            )}
            {!loading && records.map((record, index) => {
              const status = getOvertimeStatus(record.statusCode);
              return (
                <tr key={record.id}>
                  <td>{index + 1}</td>
                  <td className="lmb-strong">{formatDateLabel(record.date)}</td>
                  <td className="lmb-mono">{record.startTime}</td>
                  <td className="lmb-mono">{record.endTime}</td>
                  <td className="lmb-strong">{record.duration}</td>
                  <td>{record.reason}</td>
                  <td className="lmb-center">
                    <span className={`lmb-status lmb-status-${status.tone}`}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
