// src/pages/LogSistem/LogSistem.jsx
//
// [BARU] Halaman Log Sistem -- sebelumnya tab "Log Sistem" di halaman Manajemen Karyawan.
// Sekarang menu sendiri di sidebar (HRD_ADMIN & SUPER_ADMIN, dijaga di routes/AppRoutes.jsx dan
// di backend: /api/admin/** = ADMIN_ROLES). Log diambil sekali saat halaman dibuka, lalu bisa
// diunduh sebagai CSV.
import React, { useCallback, useEffect, useRef, useState } from 'react'; // [UBAH] + useCallback, useRef
import ReloadButton from '../../components/ReloadButton'; // [UBAH] tombol Muat Ulang bersama (sebelumnya tombol buatan sendiri di file ini)
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
  const latestRequestRef = useRef(0); // [BARU] penanda request terbaru; respons lama diabaikan

  // [UBAH] Logika ambil data dipindah ke fungsi tersendiri supaya dipakai bersama oleh
  // pemuatan awal dan tombol muat ulang (sebelumnya langsung di dalam useEffect).
  const loadLogs = useCallback(() => {
    latestRequestRef.current += 1;
    const requestId = latestRequestRef.current;
    return getSystemLogs()
      .then((response) => {
        if (requestId !== latestRequestRef.current) return;
        setLogList(formatSystemLogs(response.data || response));
        setErrorMessage('');
      })
      .catch((error) => {
        console.error('Gagal menarik data log dari server:', error);
        if (requestId === latestRequestRef.current) {
          setErrorMessage('Gagal memuat log sistem. Coba muat ulang halaman.');
        }
      })
      .finally(() => {
        if (requestId !== latestRequestRef.current) return;
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    loadLogs();
    // Halaman ditutup -> request yang masih berjalan dianggap usang.
    return () => { latestRequestRef.current += 1; };
  }, [loadLogs]);

  // [UBAH] Tombol muat ulang: ambil ulang data dari server tanpa mengosongkan tabel,
  // jadi pencarian, filter, dan halaman yang sedang dibuka tidak ikut ter-reset.
  // Status "Memuat..." diurus ReloadButton lewat Promise yang dikembalikan loadLogs.
  const handleReload = () => {
    setErrorMessage('');
    return loadLogs();
  };

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
            <>
              {/* [UBAH] Tombol muat ulang data log (komponen bersama) */}
              <ReloadButton className="reloadBtn--lg" onReload={handleReload} title="Ambil ulang data log terbaru dari server" />
              <ReportExportButtons
                formats={SYSTEM_LOG_EXPORT.formats}
                exportingKey={exportingKey}
                onExport={handleExport}
              />
            </>
          )}
        />
      )}
    </div>
  );
}
