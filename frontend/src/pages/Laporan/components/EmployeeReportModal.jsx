// src/pages/Laporan/components/EmployeeReportModal.jsx
//
// [BARU] Popup "sheet" satu karyawan: identitas, rekap angka, dan tabel harian
// satu periode penuh. Bisa mengunduh sheet karyawan ini saja (XLSX / CSV / PDF).
// Menutup dengan tombol X, klik latar, atau Escape (animasi keluar via useModalExit).
//
// Contoh pemakaian:
// <EmployeeReportModal report={report} periodLabel="..." exportingKind={null}
//   onExport={(kind) => ...} onClose={() => setSelectedId(null)} />
import React, { useEffect } from 'react';
import { FileDown, FileSpreadsheet, FileText, X } from 'lucide-react';
import useModalExit from '../../../hooks/useModalExit';
import { formatOvertimeDuration } from '../../../services/overtimeService';
import { EXPORT_FORMATS, STATUS_TONE_CLASS } from '../config/laporanConfig';
import { buildDailyRows, DAILY_HEADERS } from '../utils/attendanceReportSheets';
import './EmployeeReportModal.css';

const EXPORT_ICONS = { sheet: FileSpreadsheet, text: FileText, pdf: FileDown };

const formatLeave = (value) => String(Number(value.toFixed(1))).replace('.', ',');

export default function EmployeeReportModal({ report, periodLabel, exportingKind, onExport, onClose }) {
  const { closing, close } = useModalExit();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close(onClose);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, onClose]);

  if (!report) return null;

  const { summary } = report;
  const dailyRows = buildDailyRows(report);
  const statusColumn = DAILY_HEADERS.indexOf('Status');
  const stats = [
    { label: 'Hadir', value: summary.present, tone: 'hadir' },
    { label: 'Terlambat', value: summary.late, tone: 'telat' },
    { label: 'Sakit', value: summary.sick, tone: 'sakit' },
    { label: 'Izin', value: summary.izin, tone: 'izin' },
    { label: 'Cuti', value: formatLeave(summary.leave), tone: 'izin' },
    { label: 'Alpha', value: summary.absent, tone: 'alpha' },
    { label: 'Lembur ACC', value: formatOvertimeDuration(summary.overtimeMinutes), tone: 'telat' },
  ];

  return (
    <div className={`lpr-modal-overlay${closing ? ' is-closing' : ''}`} onMouseDown={() => close(onClose)}>
      <section
        className="lpr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lpr-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="lpr-modal-header">
          <div>
            <h2 id="lpr-modal-title">{report.fullName}</h2>
            <p>{report.nik} · {report.position} · {report.divisionName}</p>
            <p>Periode {periodLabel}</p>
          </div>
          <button type="button" onClick={() => close(onClose)} aria-label="Tutup detail">
            <X />
          </button>
        </header>

        <div className="lpr-modal-stats">
          {stats.map((stat) => (
            <div key={stat.label} className={`lpr-modal-stat lpr-modal-stat--${stat.tone}`}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="lpr-modal-body">
          <table className="lpr-daily-table">
            <thead>
              <tr>{DAILY_HEADERS.map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {dailyRows.map((cells, rowIndex) => {
                const tone = report.rows[rowIndex].tone;
                const isOff = !tone;
                return (
                  <tr key={report.rows[rowIndex].date} className={isOff ? 'is-off' : ''}>
                    {cells.map((cell, cellIndex) => (
                      <td key={DAILY_HEADERS[cellIndex]}>
                        {cellIndex === statusColumn && tone
                          ? <span className={`lpr-badge lpr-badge--${STATUS_TONE_CLASS[tone] || 'belum'}`}>{cell}</span>
                          : cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="lpr-modal-footer">
          {EXPORT_FORMATS.map((format) => {
            const Icon = EXPORT_ICONS[format.icon];
            return (
              <button
                key={format.key}
                type="button"
                className={`lpr-modal-btn${format.key === 'xlsx' ? ' lpr-modal-btn--primary' : ''}`}
                onClick={() => onExport(format.key)}
                disabled={Boolean(exportingKind)}
                title={format.hint}
              >
                <Icon aria-hidden="true" /> {exportingKind === format.key ? 'Menyiapkan...' : `Unduh ${format.label}`}
              </button>
            );
          })}
        </footer>
      </section>
    </div>
  );
}
