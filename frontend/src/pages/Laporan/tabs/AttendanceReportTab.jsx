// src/pages/Laporan/tabs/AttendanceReportTab.jsx
//
// [BARU] Tab "Laporan Absen" (HRD): tabel absensi semua divisi & karyawan per
// periode tutup buku, bisa diekspor XLSX / CSV / PDF untuk SEMUA divisi atau SATU
// divisi (pilihan divisi = cakupan tabel sekaligus ekspor). Dalam file hasil
// ekspor, satu karyawan = satu sheet (lihat utils/attendanceReportSheets.js).
//
// Pemuatan data lewat hooks/useAttendanceReport.js (1 request, sudah difilter
// di backend); komponen ini hanya mengatur filter, paginasi, dan ekspor.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Toast from '../../../components/Toast';
import { getAllDivisi } from '../../../services/divisiService';
import { downloadCsvSections } from '../../../utils/csvExport';
import { formatPeriodLabel, getCurrentPeriod } from '../../Absensi/utils/monthlyAttendance';
import AttendanceReportTable from '../components/AttendanceReportTable';
import EmployeeReportModal from '../components/EmployeeReportModal';
import ReportFilterBar from '../components/ReportFilterBar';
import ReportStatCards from '../components/ReportStatCards';
import { ALL_DIVISIONS_LABEL, ALL_DIVISIONS_VALUE, DEFAULT_PAGE_SIZE } from '../config/laporanConfig';
import useAttendanceReport from '../hooks/useAttendanceReport';
import { summarizeAll } from '../utils/attendanceReportBuilder';
import { buildExportSheets, toFileSlug } from '../utils/attendanceReportSheets';
import './AttendanceReportTab.css';

const TOAST_DURATION_MS = 3500;

export default function AttendanceReportTab() {
  const [period, setPeriod] = useState(getCurrentPeriod);
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
  const { reports, isLoading, error, reload } = useAttendanceReport({
    period,
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

  const periodLabel = formatPeriodLabel(period.year, period.month);
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
  const shiftPeriod = (delta) => {
    const target = new Date(period.year, period.month + delta, 1);
    if (target > new Date(currentPeriod.year, currentPeriod.month, 1)) return; // tidak boleh melewati periode berjalan
    setPeriod({ year: target.getFullYear(), month: target.getMonth() });
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
      const sheets = buildExportSheets(targetReports, { periodLabel, scopeLabel });
      const fileNamePrefix = `laporan-absensi_${toFileSlug(fileLabel)}_${period.year}-${String(period.month + 1).padStart(2, '0')}`;
      if (kind === 'csv') {
        downloadCsvSections({ sections: sheets, fileNamePrefix });
      } else if (kind === 'xlsx') {
        // Library Excel di-load lazy: baru diunduh browser saat tombol XLSX diklik.
        const { downloadSheetsXlsx } = await import('../../../utils/attendanceReportXlsx');
        await downloadSheetsXlsx({ sheets, fileNamePrefix });
      } else {
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
        periodLabel={periodLabel}
        canGoNext={period.year < currentPeriod.year || (period.year === currentPeriod.year && period.month < currentPeriod.month)}
        onPreviousPeriod={() => shiftPeriod(-1)}
        onNextPeriod={() => shiftPeriod(1)}
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
          periodLabel={periodLabel}
          exportingKind={exportingKind}
          onExport={(kind) => runExport(kind, [selectedReport], selectedReport.fullName)}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}

      <Toast show={Boolean(toast)} message={toast?.message} type={toast?.type} />
    </div>
  );
}
