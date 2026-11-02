// src/pages/Laporan/tabs/AttendanceReportTab.jsx
//
// [BARU] Tab "Laporan Absen" (HRD): tabel absensi semua divisi & karyawan per
// periode tutup buku, bisa diekspor XLSX / CSV / PDF untuk SEMUA divisi atau SATU
// divisi (pilihan divisi = cakupan tabel sekaligus ekspor). Dalam file hasil
// ekspor, satu karyawan = satu sheet (lihat utils/attendanceReportSheets.js).
//
// Pemuatan data lewat hooks/useAttendanceReport.js (1 request, sudah difilter
// di backend); komponen ini hanya mengatur filter, paginasi, dan ekspor.
// [UBAH] Rentang laporan punya 3 mode (lihat ReportRangeControl): per periode tutup
// buku, Hari Ini, atau tanggal pilihan (Dari - Sampai).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Toast from '../../../components/Toast';
import { getAllDivisi } from '../../../services/divisiService';
import { downloadCsv } from '../../../utils/csvExport';
import { getCurrentPeriod } from '../../Absensi/utils/monthlyAttendance';
import AttendanceReportTable from '../components/AttendanceReportTable';
import EmployeeReportModal from '../components/EmployeeReportModal';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportRangeControl from '../components/ReportRangeControl'; // [BARU]
import ReportStatCards from '../components/ReportStatCards';
import {
  ALL_DIVISIONS_LABEL,
  ALL_DIVISIONS_VALUE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_RANGE_MODE,
} from '../config/laporanConfig';
import useAttendanceReport from '../hooks/useAttendanceReport';
import { summarizeAll } from '../utils/attendanceReportBuilder';
import { buildExportSheets, buildFlatCsvTable, toFileSlug } from '../utils/attendanceReportSheets';
import { applyCustomFrom, createDefaultCustomRange, resolveReportRange } from '../utils/reportRange'; // [BARU]
import './AttendanceReportTab.css';

const TOAST_DURATION_MS = 3500;

export default function AttendanceReportTab() {
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [rangeMode, setRangeMode] = useState(DEFAULT_RANGE_MODE); // [BARU]
  const [customRange, setCustomRange] = useState(createDefaultCustomRange); // [BARU] { from, to }
  const [divisionId, setDivisionId] = useState(ALL_DIVISIONS_VALUE);
  const [divisions, setDivisions] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [exportingKind, setExportingKind] = useState(null);
  const [toast, setToast] = useState(null);

  const exportingRef = useRef(false); // gerbang sinkron anti klik ganda (state saja terlambat satu render)
  const toastTimerRef = useRef(null);

  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  // [BARU] Rentang aktif (from, to, label, fileKey, isSingleDay) dari mode yang dipilih.
  const range = useMemo(
    () => resolveReportRange({ mode: rangeMode, period, customRange }),
    [rangeMode, period, customRange],
  );
  const { reports, isLoading, error, reload } = useAttendanceReport({
    from: range.from, // [UBAH] sebelumnya `period`
    to: range.to,
    divisionId: divisionId || null,
  });

  const showToast = (message, type = 'success') => {
    window.clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
  };

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  // Daftar divisi untuk dropdown cakupan.
  useEffect(() => {
    let cancelled = false;
    getAllDivisi()
      .then((data) => { if (!cancelled) setDivisions(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setDivisions([]); });
    return () => { cancelled = true; };
  }, []);

  const divisionOptions = useMemo(() => [
    { value: ALL_DIVISIONS_VALUE, label: ALL_DIVISIONS_LABEL },
    ...divisions.map((division) => ({ value: String(division.id), label: division.namaDivisi })),
  ], [divisions]);

  const scopeLabel = divisionId
    ? divisions.find((division) => String(division.id) === divisionId)?.namaDivisi || 'Satu Divisi'
    : ALL_DIVISIONS_LABEL;

  const filteredReports = useMemo(() => {
    const keyword = searchValue.trim().toLocaleLowerCase('id-ID');
    if (!keyword) return reports;
    return reports.filter((report) => (
      report.fullName.toLocaleLowerCase('id-ID').includes(keyword)
      || String(report.nik).toLocaleLowerCase('id-ID').includes(keyword)
    ));
  }, [reports, searchValue]);

  const totals = useMemo(() => summarizeAll(reports), [reports]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filteredReports.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const selectedReport = reports.find((report) => report.employeeId === selectedEmployeeId) || null;

  // ---------- handler filter (semua mengembalikan tabel ke halaman pertama) ----------
  // [UBAH] Periode dipilih langsung dari PeriodPicker (panah / klik label) -- tidak boleh
  // melewati periode berjalan (dijaga PeriodPicker lewat maxValue).
  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod);
    setPage(0);
  };

  // [BARU] Ganti mode rentang & ubah tanggal pilihan. "Sampai" otomatis menyesuaikan
  // bila "Dari" diganti (lihat applyCustomFrom).
  const handleRangeModeChange = (nextMode) => {
    setRangeMode(nextMode);
    setPage(0);
  };

  const handleCustomFromChange = (from) => {
    setCustomRange((current) => applyCustomFrom(current, from));
    setPage(0);
  };

  const handleCustomToChange = (to) => {
    setCustomRange((current) => ({ ...current, to }));
    setPage(0);
  };

  const handleDivisionChange = (value) => {
    setDivisionId(value);
    setPage(0);
  };

  const handleSearchChange = (value) => {
    setSearchValue(value);
    setPage(0);
  };

  // ---------- ekspor ----------
  // targetReports: laporan yang diekspor; fileLabel: bagian nama file.
  const runExport = async (kind, targetReports, fileLabel) => {
    if (exportingRef.current || targetReports.length === 0) return;
    exportingRef.current = true;
    setExportingKind(kind);
    try {
      const fileNamePrefix = `laporan-absensi_${toFileSlug(fileLabel)}_${range.fileKey}`; // [UBAH]
      if (kind === 'csv') {
        // [UBAH] CSV = satu tabel panjang tanpa ringkasan (bukan satu blok per karyawan).
        const { headers, rows } = buildFlatCsvTable(targetReports);
        downloadCsv({ headers, rows, fileNamePrefix });
      } else if (kind === 'xlsx') {
        const sheets = buildExportSheets(targetReports, { periodLabel: range.label, scopeLabel });
        // Library Excel di-load lazy: baru diunduh browser saat tombol XLSX diklik.
        const { downloadSheetsXlsx } = await import('../../../utils/attendanceReportXlsx');
        await downloadSheetsXlsx({ sheets, fileNamePrefix });
      } else {
        const sheets = buildExportSheets(targetReports, { periodLabel: range.label, scopeLabel });
        // jsPDF di-load lazy: baru diunduh browser saat tombol PDF diklik.
        const { downloadSheetsPdf } = await import('../../../utils/attendanceReportPdf');
        downloadSheetsPdf({ sheets, fileNamePrefix });
      }
      showToast(`Laporan ${kind.toUpperCase()} berhasil diunduh.`);
    } catch {
      showToast(`Gagal membuat file ${kind.toUpperCase()}. Coba lagi.`, 'error');
    } finally {
      exportingRef.current = false;
      setExportingKind(null);
    }
  };

  return (
    <div className="lpr-attendance-tab">
      <ReportFilterBar
        rangeControl={(
          <ReportRangeControl
            mode={rangeMode}
            onModeChange={handleRangeModeChange}
            period={period}
            maxPeriod={currentPeriod}
            onPeriodChange={handlePeriodChange}
            customRange={customRange}
            onCustomFromChange={handleCustomFromChange}
            onCustomToChange={handleCustomToChange}
          />
        )}
        divisionOptions={divisionOptions}
        divisionId={divisionId}
        onDivisionChange={handleDivisionChange}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        scopeLabel={scopeLabel}
        employeeCount={reports.length}
        exportingKind={exportingKind}
        isExportDisabled={isLoading || reports.length === 0}
        onExport={(kind) => runExport(kind, reports, scopeLabel)}
      />

      <ReportStatCards totals={totals} isLoading={isLoading} />

      {error ? (
        <div className="lpr-error-card" role="alert">
          <p>{error}</p>
          <button type="button" onClick={reload}>Coba Lagi</button>
        </div>
      ) : (
        <AttendanceReportTable
          rows={pageRows}
          startIndex={safePage * pageSize}
          isLoading={isLoading}
          isSingleDay={range.isSingleDay}
          totalItems={filteredReports.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
          onSelect={setSelectedEmployeeId}
        />
      )}

      {selectedReport && (
        <EmployeeReportModal
          report={selectedReport}
          periodLabel={range.label}
          exportingKind={exportingKind}
          onExport={(kind) => runExport(kind, [selectedReport], selectedReport.fullName)}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}

      <Toast show={Boolean(toast)} message={toast?.message} type={toast?.type} />
    </div>
  );
}
