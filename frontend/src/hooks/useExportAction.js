// src/hooks/useExportAction.js
//
// [BARU] Hook ekspor data untuk halaman laporan (Ringkasan Cuti, Histori Cuti, Log Sistem).
// Menjalankan satu ekspor berdasarkan entri config/leaveReportExportConfig.js dan mengurus:
//   - gerbang anti klik ganda (ref sinkron -- state saja terlambat satu render)
//   - status "sedang mengekspor" untuk tombol (exportingKey = format yang berjalan)
//   - toast pesan error / data kosong (tampilkan lewat <Toast show={!!toast} ... />)
//
// Contoh pemakaian:
// const { exportingKey, toast, runExport } = useExportAction();
// runExport('csv', SYSTEM_LOG_EXPORT, { logList });
import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadCsv } from '../utils/csvExport';
import { downloadBlobFile } from '../utils/csvFile';

const TOAST_DURATION_MS = 3500;
const EXPORT_FAILED_MESSAGE = 'Gagal mengekspor data. Silakan coba lagi.';

export default function useExportAction() {
  const [exportingKey, setExportingKey] = useState(null);
  const [toast, setToast] = useState(null);
  const isRunningRef = useRef(false);
  const toastTimerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  const showToast = useCallback((message, type) => {
    window.clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  const runExport = useCallback(async (format, exportConfig, context) => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setExportingKey(format);
    try {
      if (format === 'xlsx' && exportConfig.xlsx) {
        const blob = await exportConfig.xlsx.buildBlob(context);
        downloadBlobFile(exportConfig.xlsx.buildFileName(context), blob);
        return;
      }

      const rows = await exportConfig.buildRows(context);
      if (rows.length === 0) {
        showToast(exportConfig.emptyMessage, 'error');
        return;
      }
      downloadCsv({
        headers: exportConfig.headers,
        rows,
        fileNamePrefix: exportConfig.fileNamePrefix,
      });
    } catch (error) {
      console.error('Gagal mengekspor data:', error);
      showToast(EXPORT_FAILED_MESSAGE, 'error');
    } finally {
      isRunningRef.current = false;
      setExportingKey(null);
    }
  }, [showToast]);

  return { exportingKey, toast, runExport };
}
