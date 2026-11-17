// src/pages/Laporan/tabs/LeaveSummaryReportTab.jsx
//
// [BARU] Tab "Ringkasan Cuti" di halaman Laporan (pindahan dari halaman Manajemen Karyawan).
// Tabelnya mengambil datanya sendiri (LeaveSummaryTable); tab ini hanya menambah tombol ekspor CSV
// untuk baris yang SEDANG tampil di tabel (pencarian, filter tanggal, urutan).
import React, { useCallback, useRef } from 'react';
import Toast from '../../../components/Toast';
import { LEAVE_SUMMARY_EXPORT } from '../../../config/leaveReportExportConfig';
import useExportAction from '../../../hooks/useExportAction';
import LeaveSummaryTable from '../components/LeaveSummaryTable';
import ReportExportBar from '../components/ReportExportBar';

export default function LeaveSummaryReportTab() {
  // Baris yang tampil dilaporkan tabel lewat ref (bukan state) supaya tidak memicu render ulang.
  const visibleRowsRef = useRef([]);
  const handleRowsChange = useCallback((rows) => {
    visibleRowsRef.current = rows;
  }, []);

  const { exportingKey, toast, runExport } = useExportAction();
  const handleExport = (format) => runExport(format, LEAVE_SUMMARY_EXPORT, { summaryRows: visibleRowsRef.current });

  return (
    <div className="lpr-stack">
      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
      <ReportExportBar
        caption="Ekspor CSV mengikuti baris yang sedang tampil di tabel (pencarian, filter tanggal, urutan)."
        formats={LEAVE_SUMMARY_EXPORT.formats}
        exportingKey={exportingKey}
        onExport={handleExport}
      />
      <LeaveSummaryTable onExportRowsChange={handleRowsChange} />
    </div>
  );
}
