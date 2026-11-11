// src/pages/Laporan/components/EmployeeReportModal.jsx
//
// [BARU] Popup "sheet" satu karyawan: identitas, rekap angka, dan tabel harian
// satu periode penuh. Bisa mengunduh sheet karyawan ini saja (XLSX / CSV / PDF).
// Menutup dengan tombol X, klik latar, atau Escape (animasi keluar via useModalExit).
//
// Contoh pemakaian:
// <EmployeeReportModal report={report} periodLabel="..." exportingKind={null}
//   onExport={(kind) => ...} onClose={() => setSelectedId(null)} />
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, X } from 'lucide-react';
import useModalExit from '../../../hooks/useModalExit';
import { EXPORT_FORMATS, STATUS_TONE_CLASS } from '../config/laporanConfig';
import { buildDailyRows, DAILY_HEADERS, formatAccHours } from '../utils/attendanceReportSheets';
import './EmployeeReportModal.css';

function safePhotoUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function AttendancePhoto({ record, label, onPreview }) {
  const url = record?.photoUrl && safePhotoUrl(record.photoUrl);
  if (!url) return <span aria-label={`Foto ${label} tidak tersedia`}>-</span>;
  return <button type="button" className="lpr-proof-photo" onClick={() => onPreview({ url, label })} aria-label={`Lihat foto ${label}`}>
    <img src={url} alt={`Foto ${label}`} loading="lazy" />
    <span>Lihat foto</span>
  </button>;
}

function AttendanceGps({ record, label }) {
  const lat = record?.latitude;
  const lng = record?.longitude;
  if (lat == null || lng == null || lat === '' || lng === '' || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))
    || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) return <span>-</span>;
  const coordinates = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  return <a className="lpr-proof-gps" href={`https://www.google.com/maps?q=${encodeURIComponent(`${Number(lat)},${Number(lng)}`)}`}
    target="_blank" rel="noopener noreferrer" aria-label={`Lihat GPS ${label}: ${coordinates} di peta`}>
    <span>{coordinates}</span><small>{record.locationName || 'Lihat di peta'} ↗</small>
  </a>;
}

function PhotoPreview({ photo, onClose }) {
  const buttonRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    buttonRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') { event.preventDefault(); buttonRef.current?.focus(); }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => { document.removeEventListener('keydown', handleKey, true); previous?.focus(); };
  }, [onClose]);
  return <div className="lpr-photo-overlay" onMouseDown={(event) => { event.stopPropagation(); onClose(); }}>
    <section className="lpr-photo-modal" role="dialog" aria-modal="true" aria-labelledby="lpr-photo-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><h3 id="lpr-photo-title">{photo.label}</h3><button ref={buttonRef} type="button" onClick={onClose} aria-label="Tutup foto"><X /></button></header>
      <img src={photo.url} alt={photo.label} />
    </section>
  </div>;
}

const EXPORT_ICONS = { sheet: FileSpreadsheet, text: FileText, pdf: FileDown };

const formatLeave = (value) => String(Number(value.toFixed(1))).replace('.', ',');

export default function EmployeeReportModal({ report, periodLabel, exportingKind, onExport, onClose }) {
  const { closing, close } = useModalExit();
  const [preview, setPreview] = useState(null);
  // [UBAH] Baris harian dihitung SEKALI per laporan, bukan di setiap render
  // (render ulang terjadi saat foto dibuka/ditutup & saat animasi keluar).
  const dailyRows = useMemo(() => (report ? buildDailyRows(report) : []), [report]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !preview) close(onClose);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, onClose, preview]);

  if (!report) return null;

  const { summary } = report;
  const statusColumn = DAILY_HEADERS.indexOf('Status');
  const stats = [
    { label: 'Hadir', value: summary.present, tone: 'hadir' },
    { label: 'Terlambat', value: summary.late, tone: 'telat' },
    { label: 'Sakit', value: summary.sick, tone: 'sakit' },
    { label: 'Izin', value: summary.izin, tone: 'izin' },
    { label: 'Cuti', value: formatLeave(summary.leave), tone: 'izin' },
    { label: 'Alpha', value: summary.absent, tone: 'alpha' },
    { label: 'Lembur ACC', value: formatAccHours(summary.overtimeAccMinutes), tone: 'telat' }, // [UBAH]
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
              <tr>{DAILY_HEADERS.map((header) => <th key={header}>{header}</th>)}
                {["Foto Masuk", "Foto Pulang", "GPS Masuk", "GPS Pulang"].map((header) => <th key={header}>{header}</th>)}
              </tr>
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
                    <td><AttendancePhoto record={report.rows[rowIndex].checkInEvidence} label={`Absen Masuk · ${report.rows[rowIndex].dateLabel}`} onPreview={setPreview} /></td>
                    <td><AttendancePhoto record={report.rows[rowIndex].checkOutEvidence} label={`Absen Pulang · ${report.rows[rowIndex].dateLabel}`} onPreview={setPreview} /></td>
                    <td><AttendanceGps record={report.rows[rowIndex].checkInEvidence} label="masuk" /></td>
                    <td><AttendanceGps record={report.rows[rowIndex].checkOutEvidence} label="pulang" /></td>
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
      {preview && <PhotoPreview photo={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
