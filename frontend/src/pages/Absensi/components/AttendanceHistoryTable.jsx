// src/pages/Absensi/components/AttendanceHistoryTable.jsx
//
// [UBAH] Tabel riwayat sekarang bertajuk "JADWAL & LOG ABSENSI BULANAN
// KARYAWAN": ada filter PERIODE BULAN (panah sebelumnya/berikutnya) berbasis
// TUTUP BUKU (tgl 21 s/d tgl 20, mis. 21 Agu - 20 Sep), tombol
// Unduh CSV & Unduh PDF untuk rekap bulan yang dipilih, dan kolom tabel
// disamakan dengan desain: Tanggal, Jadwal Shift, Jam Masuk, Jam Pulang,
// Durasi, Status Presence, Keterangan / Catatan, Bukti / Foto.
// Kontrol "Lihat semua / Ringkas" + paginasi TETAP dipertahankan; di mode
// "Lihat semua" ada pilihan jumlah baris per halaman (10 / 20 / 30).
//
// [UBAH] Urutan kolom sekarang: Tanggal, Jadwal Shift, Jam Masuk, Jam Pulang,
// Durasi, Status Presence, LOKASI & FOTO (dulu "Bukti / Foto"), LEMBUR (baru,
// dari menu Pengajuan Lembur), Keterangan / Catatan.
//
// Header kolom bisa diklik untuk sort naik/turun (asc/desc); nilai kosong ("-")
// selalu diurutkan paling bawah, apa pun arahnya.
//
// "Lihat semua" menampilkan SETIAP tanggal dalam periode (21 s/d 20, sampai
// hari ini); tanggal tanpa data tetap muncul dengan isi "-".
//
// Pembentukan baris (per hari, status, keterangan, dst) ada di
// ../utils/monthlyAttendance.js -- dipakai bersama oleh tabel, CSV, dan PDF
// supaya isinya selalu sama.
//
// [CATATAN PENGEMBANGAN] Status "CUTI" saat ini hanya berasal dari
// pengajuan Izin lewat halaman Absensi. Untuk memasukkan cuti tahunan yang
// disetujui di modul Cuti (leave_requests), tambahkan sumber datanya di
// buildMonthlyRows() -- struktur tabel tidak perlu diubah.
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, FileDown, FileText, MapPin } from 'lucide-react';
import { downloadCsv } from '../../../utils/csvExport';
import {
  REPORT_HEADERS,
  attachOvertime,
  buildMonthlyRows,
  formatPeriodLabel,
  getCurrentPeriod,
  toReportRows,
} from '../utils/monthlyAttendance';
import './AttendanceHistoryTable.css';

const COLLAPSED_ROW_COUNT = 3;
const PAGE_SIZE_OPTIONS = [10, 20, 30]; // pilihan jumlah baris per halaman (mode "Lihat semua")
const DEFAULT_PAGE_SIZE = 10;
// [BARU] Definisi kolom: `value` = nilai yang dipakai untuk sort. Nilai kosong
// (null / '' / '-') selalu ditaruh paling bawah.
const COLUMNS = [
  { key: 'date', label: 'TANGGAL', value: (row) => row.date },
  { key: 'shift', label: 'JADWAL SHIFT', value: (row) => row.shift },
  { key: 'checkIn', label: 'JAM MASUK', value: (row) => row.checkIn },
  { key: 'checkOut', label: 'JAM PULANG', value: (row) => row.checkOut },
  { key: 'duration', label: 'DURASI', value: (row) => row.durationMinutes },
  { key: 'status', label: 'STATUS PRESENCE', value: (row) => (row.tone ? row.status : null) },
  { key: 'proof', label: 'LOKASI & FOTO', value: (row) => (row.photoUrl ? row.proofLabel : null), sortable: false },
  { key: 'overtime', label: 'LEMBUR', value: (row) => (row.overtime && row.overtime.tone !== 'rejected' ? row.overtime.minutes : null) },
  { key: 'note', label: 'KETERANGAN / CATATAN', value: (row) => row.note, sortable: false },
];

const isBlank = (value) => value === null || value === undefined || value === '' || value === '-';

const REPORT_TITLE = 'JADWAL & LOG ABSENSI BULANAN KARYAWAN';

function BuktiCell({ row }) {
  if (!row.photoUrl && !row.mapsUrl) return <span className="abs-empty-cell">-</span>;
  return (
    <div className="abs-link-stack">
      {row.photoUrl && (
        <a className="abs-photo-link" href={row.photoUrl} target="_blank" rel="noreferrer">
          <CircleCheck aria-hidden="true" />
          {row.proofLabel || 'Selfie GPS'}
        </a>
      )}
      {row.mapsUrl && (
        <a className="abs-maps-pin" href={row.mapsUrl} target="_blank" rel="noreferrer">
          <MapPin aria-hidden="true" />
          Peta
        </a>
      )}
    </div>
  );
}

// [BARU] Sel kolom Lembur: durasi + badge status (ACC / Menunggu / Ditolak).
function OvertimeCell({ overtime }) {
  if (!overtime) return <span className="abs-empty-cell">-</span>;
  if (overtime.tone === 'rejected') {
    return <span className="abs-overtime-badge abs-overtime-rejected">{overtime.statusLabel}</span>;
  }
  return (
    <div className="abs-overtime-stack">
      <strong>{overtime.duration}</strong>
      <span className={`abs-overtime-badge abs-overtime-${overtime.tone}`}>{overtime.statusLabel}</span>
    </div>
  );
}

export default function AttendanceHistoryTable({ records, overtimeRecords = [] }) {
  const currentPeriod = useMemo(() => getCurrentPeriod(new Date()), []);
  const [period, setPeriod] = useState(currentPeriod);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [exporting, setExporting] = useState(false);

  const isCurrentPeriod = period.year === currentPeriod.year && period.month === currentPeriod.month;
  const periodLabel = formatPeriodLabel(period.year, period.month);

  const dailyRows = useMemo(
    () => attachOvertime(buildMonthlyRows(records, period.year, period.month), overtimeRecords),
    [records, overtimeRecords, period.year, period.month],
  );

  // Urutan di layar mengikuti sort; ekspor CSV/PDF tetap urut tanggal
  // (dailyRows) supaya rekap konsisten.
  const sortedRows = useMemo(() => {
    const column = COLUMNS.find((item) => item.key === sort.key) || COLUMNS[0];
    const factor = sort.dir === 'asc' ? 1 : -1;
    const byDateDesc = (a, b) => (a.date < b.date ? 1 : -1);
    return [...dailyRows].sort((a, b) => {
      const valueA = column.value(a);
      const valueB = column.value(b);
      const blankA = isBlank(valueA);
      const blankB = isBlank(valueB);
      if (blankA && blankB) return byDateDesc(a, b);
      if (blankA) return 1;
      if (blankB) return -1;
      const result = typeof valueA === 'number' && typeof valueB === 'number'
        ? valueA - valueB
        : String(valueA).localeCompare(String(valueB), 'id');
      return result === 0 ? byDateDesc(a, b) : result * factor;
    });
  }, [dailyRows, sort]);

  const toggleSort = (key) => {
    setSort((current) => (
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    ));
    setPage(0);
  };

  const totalPages = Math.max(1, Math.ceil(dailyRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const visibleRows = useMemo(() => {
    if (!expanded) return sortedRows.slice(0, COLLAPSED_ROW_COUNT);
    const start = safePage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, expanded, safePage, pageSize]);

  const rangeStart = dailyRows.length === 0 ? 0 : safePage * pageSize + 1;
  const rangeEnd = Math.min(dailyRows.length, (safePage + 1) * pageSize);

  const changePageSize = (event) => {
    setPageSize(Number(event.target.value));
    setPage(0); // kembali ke halaman 1 supaya tidak melompat ke halaman kosong
  };

  const goToPage = (next) => {
    if (next < 0 || next >= totalPages) return;
    setPage(next);
  };

  const toggleExpanded = () => {
    setExpanded((current) => !current);
    setPage(0);
  };

  const shiftPeriod = (delta) => {
    setPeriod((current) => {
      const target = new Date(current.year, current.month + delta, 1);
      // Tidak boleh melewati periode yang sedang berjalan.
      if (target > new Date(currentPeriod.year, currentPeriod.month, 1)) return current;
      return { year: target.getFullYear(), month: target.getMonth() };
    });
    setPage(0);
  };

  const filePrefix = `rekap_absensi_tutup-buku_${period.year}-${String(period.month + 1).padStart(2, '0')}`;

  const handleExportCsv = () => {
    downloadCsv({
      headers: REPORT_HEADERS,
      rows: toReportRows(dailyRows, { includeUrl: true }),
      fileNamePrefix: filePrefix,
    });
  };

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      // jsPDF di-load lazy: baru diunduh browser saat tombol ini diklik.
      const { downloadAttendancePdf } = await import('../../../utils/attendancePdfExport');
      downloadAttendancePdf({
        title: REPORT_TITLE,
        periodLabel,
        fileNamePrefix: filePrefix,
        headers: REPORT_HEADERS,
        rows: toReportRows(dailyRows),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="abs-history-section">
      <div className="abs-section-heading">
        <div>
          <h2>{REPORT_TITLE}</h2>
          <div className="abs-period-filter">
            <span className="abs-period-label">Periode Bulan:</span>
            <div className="abs-period-picker">
              <button type="button" onClick={() => shiftPeriod(-1)} aria-label="Bulan sebelumnya">
                <ChevronLeft aria-hidden="true" />
              </button>
              <span className="abs-period-value">{periodLabel}</span>
              <button type="button" onClick={() => shiftPeriod(1)} disabled={isCurrentPeriod} aria-label="Bulan berikutnya">
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="abs-heading-actions">
          <button type="button" className="abs-outline-button" onClick={toggleExpanded}>
            {expanded ? 'Ringkas' : 'Lihat semua'}
            <ChevronDown className={expanded ? 'is-flipped' : ''} aria-hidden="true" />
          </button>
          <button type="button" className="abs-outline-button" onClick={handleExportCsv}>
            <FileText aria-hidden="true" />
            Unduh Rekap CSV
          </button>
          <button type="button" className="abs-dark-button" onClick={handleExportPdf} disabled={exporting}>
            <FileDown aria-hidden="true" />
            {exporting ? 'Menyiapkan...' : 'Unduh Rekap PDF'}
          </button>
        </div>
      </div>

      <div className="abs-table-wrap">
        <table className="abs-log-table">
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                if (column.sortable === false) 
                  return <th key={column.key}>{column.label}</th>;
                
                const active = sort.key === column.key;
                const SortIcon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th key={column.key} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button
                      type="button"
                      className={`abs-sort-button${active ? ' is-active' : ''}`}
                      onClick={() => toggleSort(column.key)}
                      title={`Urutkan ${column.label}`}
                    >
                      <span>{column.label}</span>
                      <SortIcon aria-hidden="true" />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          {/* key={...} memaksa remount <tbody> supaya animasi baris
              (abs-tbody-page) terpicu ulang tiap ganti halaman/bulan. */}
          <tbody key={`${period.year}-${period.month}-${sort.key}-${sort.dir}-${pageSize}-${expanded ? `page-${safePage}` : 'collapsed'}`} className="abs-tbody-page">
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={9} className="abs-empty-row">Belum ada riwayat absensi pada periode ini.</td>
              </tr>
            )}
            {visibleRows.map((row, index) => (
              <tr key={row.date} className={row.isToday ? 'is-today' : ''} style={{ animationDelay: `${index * 0.04}s` }}>
                <td className="abs-date-cell">
                  <strong>{row.dateLabel}</strong>
                  {row.isToday && <span className="abs-today-tag"> (Hari ini)</span>}
                </td>
                <td className="abs-shift-cell">{row.shift === '-' ? <span className="abs-empty-cell">-</span> : row.shift}</td>
                <td className="abs-mono-cell">{row.checkIn || <span className="abs-empty-cell">{row.isToday ? '--:--:--' : '-'}</span>}</td>
                <td className="abs-mono-cell">{row.checkOut || <span className="abs-empty-cell">{row.isToday ? '--:--:--' : '-'}</span>}</td>
                <td className="abs-duration-cell">{row.duration || <span className="abs-empty-cell">-</span>}</td>
                <td>
                  {row.tone
                    ? <span className={`abs-record-status abs-status-${row.tone}`}>{row.status}</span>
                    : <span className="abs-empty-cell">-</span>}
                </td>
                <td><BuktiCell row={row} /></td>
                <td><OvertimeCell overtime={row.overtime} /></td>
                <td>{row.note === '-' ? <span className="abs-empty-cell">-</span> : row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expanded && (
        <div className="abs-footer-bar">
          <label className="abs-page-size">
            Tampilkan
            <select value={pageSize} onChange={changePageSize} aria-label="Jumlah baris per halaman">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            baris
          </label>

          {totalPages > 1 ? (
            <div className="abs-pagination">
              <button
                type="button"
                className="abs-page-nav"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 0}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <span className="abs-page-indicator">
                Halaman {safePage + 1} dari {totalPages}
              </span>
              <button
                type="button"
                className="abs-page-nav"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage === totalPages - 1}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : <span />}

          <span className="abs-page-range">
            {rangeStart}-{rangeEnd} dari {dailyRows.length} hari
          </span>
        </div>
      )}
    </section>
  );
}
