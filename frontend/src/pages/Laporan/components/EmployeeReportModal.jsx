// Detail laporan karyawan dalam halaman Laporan.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileDown, FileSpreadsheet, FileText, X } from 'lucide-react';
import { EXPORT_FORMATS, STATUS_TONE_CLASS } from '../config/laporanConfig';
import { buildDailyRows, DAILY_HEADERS, formatAccHours } from '../utils/attendanceReportSheets';
import ReportRowEditor from './ReportRowEditor';
import ReportRowHistory from './ReportRowHistory';
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

function ScrollableReportTable({ children }) {
  const viewportRef = useRef(null);
  const scrollbarRef = useRef(null);
  const trackRef = useRef(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    const scrollbar = scrollbarRef.current;
    const table = viewport.querySelector('table');
    const measure = () => {
      trackRef.current.style.width = `${viewport.scrollWidth}px`;
      scrollbar.scrollLeft = viewport.scrollLeft;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    if (table) observer.observe(table);
    measure();
    return () => observer.disconnect();
  }, []);
  const syncScroll = (source, target) => {
    if (target.current && target.current.scrollLeft !== source.scrollLeft) target.current.scrollLeft = source.scrollLeft;
  };
  return <div className="lpr-table-region">
    <div ref={scrollbarRef} className="lpr-table-top-scroll" onScroll={(event) => syncScroll(event.currentTarget, viewportRef)} aria-hidden="true">
      <div ref={trackRef} />
    </div>
    <div ref={viewportRef} className="lpr-modal-body lpr-table-viewport" tabIndex={0} role="region"
      aria-label="Detail absensi, dapat digeser horizontal dan vertikal"
      onScroll={(event) => syncScroll(event.currentTarget, scrollbarRef)}>{children}</div>
  </div>;
}

const EXPORT_ICONS = { sheet: FileSpreadsheet, text: FileText, pdf: FileDown };

const formatLeave = (value) => String(Number(value.toFixed(1))).replace('.', ',');

export default function EmployeeReportDetail({ report, periodLabel, exportingKind, onExport, onClose, onSaved }) {
  const [preview, setPreview] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [historyDate, setHistoryDate] = useState(null);
  // [UBAH] Baris harian dihitung SEKALI per laporan, bukan di setiap render
  // (render ulang terjadi saat foto dibuka/ditutup & saat animasi keluar).
  const dailyRows = useMemo(() => (report ? buildDailyRows(report) : []), [report]);

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
    <div className="lpr-detail-page">
      <button type="button" className="lpr-detail-back" onClick={onClose}><ArrowLeft size={16} aria-hidden="true" /> Kembali ke daftar laporan</button>
      <section
        className="lpr-modal lpr-report-detail"
        aria-labelledby="lpr-modal-title"
      >
        <header className="lpr-modal-header">
          <div>
            <h2 id="lpr-modal-title">{report.fullName}</h2>
            <p>{report.nik} · {report.position} · {report.divisionName}</p>
            <p>Periode {periodLabel}</p>
          </div>
        </header>

        <div className="lpr-modal-stats">
          {stats.map((stat) => (
            <div key={stat.label} className={`lpr-modal-stat lpr-modal-stat--${stat.tone}`}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <ScrollableReportTable>
          <table className="lpr-daily-table">
            <thead>
              <tr>{DAILY_HEADERS.map((header) => <th key={header}>{header}</th>)}
                {["Foto Masuk", "Foto Pulang", "GPS Masuk", "GPS Pulang", "Aksi"].map((header) => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((cells, rowIndex) => {
                const tone = report.rows[rowIndex].tone;
                const isOff = !tone;
                return (
                  <React.Fragment key={report.rows[rowIndex].date}>
                  <tr className={isOff ? 'is-off' : ''}>
                    {cells.map((cell, cellIndex) => (
                      <td key={DAILY_HEADERS[cellIndex]}>
                        {cellIndex === statusColumn && tone
                          ? <><span className={`lpr-badge lpr-badge--${STATUS_TONE_CLASS[tone] || 'belum'}`}>{cell}</span>{report.rows[rowIndex].history.length > 0 && <small className="lpr-edit-tag">Dikoreksi</small>}</>
                          : cell}
                      </td>
                    ))}
                    <td><AttendancePhoto record={report.rows[rowIndex].checkInEvidence} label={`Absen Masuk · ${report.rows[rowIndex].dateLabel}`} onPreview={setPreview} /></td>
                    <td><AttendancePhoto record={report.rows[rowIndex].checkOutEvidence} label={`Absen Pulang · ${report.rows[rowIndex].dateLabel}`} onPreview={setPreview} /></td>
                    <td><AttendanceGps record={report.rows[rowIndex].checkInEvidence} label="masuk" /></td>
                    <td><AttendanceGps record={report.rows[rowIndex].checkOutEvidence} label="pulang" /></td>
                    <td><div className="lpr-edit-actions">
                      {report.rows[rowIndex].canEdit && <button type="button" onClick={() => { setEditingDate(report.rows[rowIndex].date); setHistoryDate(null); }}>Edit/Sanggah</button>}
                      {report.rows[rowIndex].history.length > 0 && <button type="button" aria-haspopup="dialog"
                        onClick={() => { setHistoryDate(report.rows[rowIndex].date); setEditingDate(null); }}>Riwayat Edit ({report.rows[rowIndex].history.length})</button>}
                    </div></td>
                  </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </ScrollableReportTable>

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
      {editingDate && <ReportRowEditor key={editingDate} row={report.rows.find((row) => row.date === editingDate)} report={report}
        onClose={() => setEditingDate(null)} onSaved={() => { setEditingDate(null); onSaved?.(); }} />}
      {historyDate && <ReportRowHistory key={historyDate} row={report.rows.find((row) => row.date === historyDate)} report={report}
        onClose={() => setHistoryDate(null)} />}
      {preview && <PhotoPreview photo={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
