// src/pages/LogSistem/LogSistem.jsx
//
// [BARU] Halaman Log Sistem -- sebelumnya tab "Log Sistem" di halaman Manajemen Karyawan.
// Sekarang menu sendiri di sidebar (HRD_ADMIN & SUPER_ADMIN, dijaga di routes/AppRoutes.jsx dan
// di backend: /api/admin/** = ADMIN_ROLES). Log diambil sekali saat halaman dibuka, lalu bisa
// diunduh sebagai CSV.
import React, { useEffect, useState } from 'react';
import Toast from '../../components/Toast';
import { SYSTEM_LOG_EXPORT } from '../../config/leaveReportExportConfig';
import useExportAction from '../../hooks/useExportAction';
import { getSystemLogs } from '../../services/logService';
import ReportExportButtons from '../Laporan/components/ReportExportButtons'; // [UBAH] sebelumnya ReportExportBar (kartu terpisah)
import LogTable from './components/LogTable';
import { formatSystemLogs } from './utils/formatSystemLogs';
import './LogSistem.css';

export default function LogSistem() {
  const [logList, setLogList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const { exportingKey, toast, runExport } = useExportAction();

  useEffect(() => {
    let isCancelled = false;
    getSystemLogs()
      .then((response) => {
        if (isCancelled) return;
        setLogList(formatSystemLogs(response.data || response));
      })
      .catch((error) => {
        console.error('Gagal menarik data log dari server:', error);
        if (!isCancelled) setErrorMessage('Gagal memuat log sistem. Coba muat ulang halaman.');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => { isCancelled = true; };
  }, []);

  const handleExport = (format) => runExport(format, SYSTEM_LOG_EXPORT, { logList });

  return (
    <div className="lgs-page">
      <Toast show={!!toast} message={toast?.message} type={toast?.type} />

      {/* [UBAH] Header halaman (ikon + judul + deskripsi) dan kartu ekspor terpisah dihapus;
          tombol ekspor sekarang ada di header kartu log (prop headerActions). */}
      {errorMessage && <p className="lgs-error" role="alert">{errorMessage}</p>}
      {isLoading ? <p className="lgs-loading">Memuat log sistem...</p> : (
        <LogTable
          logList={logList}
          headerActions={(
            <ReportExportButtons
              formats={SYSTEM_LOG_EXPORT.formats}
              exportingKey={exportingKey}
              onExport={handleExport}
            />
          )}
        />
      )}
    </div>
  );
}
