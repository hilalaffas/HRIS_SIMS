// src/pages/Laporan/tabs/LeaveSummaryReportTab.jsx
//
// [BARU] Tab "Ringkasan Cuti" di halaman Laporan (pindahan dari halaman Manajemen Karyawan).
// Tabelnya mengambil datanya sendiri (LeaveSummaryTable); tab ini hanya menambah tombol ekspor CSV
// untuk baris yang SEDANG tampil di tabel (pencarian, filter tanggal, urutan). Semua baris hasil
// filter ikut terekspor (bukan hanya halaman yang tampil). [UBAH] Tombolnya kini di dalam kartu tabel.
// [UBAH] + tombol "Unduh XLSX" (Excel format ledger dari backend) pindahan tab Histori Cuti.
import React, { useCallback, useRef } from 'react';
import Toast from '../../../components/Toast';
import { LEAVE_SUMMARY_EXPORT } from '../../../config/leaveReportExportConfig';
import useExportAction from '../../../hooks/useExportAction';
import LeaveSummaryTable from '../components/LeaveSummaryTable';
import ReportExportButtons from '../components/ReportExportButtons'; // [UBAH] sebelumnya ReportExportBar (kartu terpisah)

export default function LeaveSummaryReportTab() {
  // Baris yang tampil dilaporkan tabel lewat ref (bukan state) supaya tidak memicu render ulang.
  const visibleRowsRef = useRef([]);
  const handleRowsChange = useCallback((rows) => {
    visibleRowsRef.current = rows;
  }, []);

  // [BARU] Periode & kata kunci aktif untuk ekspor Excel ledger (juga lewat ref).
  const ledgerParamsRef = useRef({ from: '', to: '', q: '' });
  const handleParamsChange = useCallback((params) => {
    ledgerParamsRef.current = params;
  }, []);

  const { exportingKey, toast, runExport } = useExportAction();
  const handleExport = (format) => runExport(format, LEAVE_SUMMARY_EXPORT, {
    summaryRows: visibleRowsRef.current,
    ledgerParams: ledgerParamsRef.current,
  });

  return (
    <div className="lpr-stack">
      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
      <LeaveSummaryTable
        onExportRowsChange={handleRowsChange}
        onExportParamsChange={handleParamsChange}
        exportActions={(
          <ReportExportButtons
            formats={LEAVE_SUMMARY_EXPORT.formats}
            exportingKey={exportingKey}
            onExport={handleExport}
          />
        )}
      />
    </div>
  );
}
