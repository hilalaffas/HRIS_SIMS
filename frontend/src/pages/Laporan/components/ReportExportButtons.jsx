// src/pages/Laporan/components/ReportExportButtons.jsx
//
// [BARU] Tombol ekspor TANPA kartu pembungkus (gaya kelas lpr-export-*, lihat ReportFilterBar.css).
// Menggantikan ReportExportBar: tombol ditaruh langsung di dalam kartu konten (toolbar tabel /
// header kartu), bukan kartu terpisah di atasnya.
//
// Contoh pemakaian:
// <ReportExportButtons formats={['csv']} exportingKey={exportingKey} onExport={handleExport} />
import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { EXPORT_FORMATS } from '../config/laporanConfig';
import './ReportFilterBar.css'; // kelas lpr-export-btn / lpr-export-actions

const EXPORT_ICONS = { sheet: FileSpreadsheet, text: FileText, pdf: FileText };

export default function ReportExportButtons({ formats, exportingKey, isDisabled = false, onExport }) {
  const availableFormats = EXPORT_FORMATS.filter((format) => formats.includes(format.key));

  return (
    <div className="lpr-export-actions">
      {availableFormats.map((format) => {
        const Icon = EXPORT_ICONS[format.icon];
        return (
          <button
            key={format.key}
            type="button"
            className={`lpr-export-btn lpr-export-btn--${format.key}`}
            onClick={() => onExport(format.key)}
            disabled={isDisabled || Boolean(exportingKey)}
          >
            <Icon aria-hidden="true" />
            {exportingKey === format.key ? 'Menyiapkan...' : `Unduh ${format.label}`}
          </button>
        );
      })}
    </div>
  );
}
