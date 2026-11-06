// src/pages/DevSettings/components/CsvExportButton.jsx
//
// [BARU] Tombol unduh CSV dengan ikon beranimasi + layar loading selama file disiapkan.
// fetchCsv harus mengembalikan teks CSV (lihat devToolsService.exportEmployeesCsv / exportLeaveCsv).
//
// Contoh pemakaian:
//   <CsvExportButton label="Export data karyawan" fileNamePrefix="data-karyawan" fetchCsv={exportEmployeesCsv} />
// [BARU] fetchBlob (opsional, menggantikan fetchCsv) -> mengembalikan Blob untuk file biner seperti .xlsx.
// [UBAH] fileName (opsional, nama lengkap termasuk .csv) menggantikan "<fileNamePrefix>-<tanggal>.csv".
import React, { useState } from 'react';
import { downloadBlobFile, downloadTextFile, getTodayStamp } from '../../../utils/csvFile';
import { DownloadIcon } from './DevDataIcons';
import DevLoadingOverlay from './DevLoadingOverlay';
import './DevDataSections.css';

export default function CsvExportButton({
  label,
  fileNamePrefix,
  fileName = '',
  fetchCsv,
  fetchBlob = null,
  disabled = false,
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setErrorMessage('');
    try {
      if (fetchBlob) {
        downloadBlobFile(fileName || `${fileNamePrefix}-${getTodayStamp()}.xlsx`, await fetchBlob());
      } else {
        const csvText = await fetchCsv();
        downloadTextFile(fileName || `${fileNamePrefix}-${getTodayStamp()}.csv`, csvText);
      }
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal menyiapkan file. Coba lagi.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="devdata-btn devdata-btn--primary"
        onClick={handleExport}
        disabled={isExporting || disabled}
      >
        <DownloadIcon className={isExporting ? 'is-busy' : ''} />
        {label}
      </button>
      {errorMessage && <p className="devsettings-error">{errorMessage}</p>}
      {isExporting && <DevLoadingOverlay message="Menyiapkan file..." />}
    </>
  );
}
