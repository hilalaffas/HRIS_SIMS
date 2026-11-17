// src/pages/Laporan/tabs/LeaveLedgerReportTab.jsx
//
// [BARU] Tab "Histori Cuti" di halaman Laporan (pindahan dari halaman Manajemen Karyawan).
// Tabelnya mengambil datanya sendiri (LeaveLedgerTable); tab ini menambah tombol unduh Excel format
// ledger yang dibuat backend, memakai periode & kata kunci yang sedang aktif di tabel.
import React, { useCallback, useRef } from 'react';
import Toast from '../../../components/Toast';
import { LEAVE_LEDGER_EXPORT } from '../../../config/leaveReportExportConfig';
import useExportAction from '../../../hooks/useExportAction';
import LeaveLedgerTable from '../components/LeaveLedgerTable';
import ReportExportBar from '../components/ReportExportBar';

export default function LeaveLedgerReportTab() {
  const ledgerParamsRef = useRef({});
  const handleParamsChange = useCallback((params) => {
    ledgerParamsRef.current = params;
  }, []);

  const { exportingKey, toast, runExport } = useExportAction();
  const handleExport = (format) => runExport(format, LEAVE_LEDGER_EXPORT, { ledgerParams: ledgerParamsRef.current });

  return (
    <div className="lpr-stack">
      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
      <ReportExportBar
        caption="Unduh Excel format ledger sesuai periode & kata kunci yang sedang aktif di tabel."
        formats={LEAVE_LEDGER_EXPORT.formats}
        exportingKey={exportingKey}
        onExport={handleExport}
      />
      <LeaveLedgerTable onExportParamsChange={handleParamsChange} />
    </div>
  );
}
