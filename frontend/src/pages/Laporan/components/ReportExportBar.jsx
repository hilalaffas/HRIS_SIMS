// src/pages/Laporan/components/ReportExportBar.jsx
//
// [BARU] Kartu ekspor sederhana untuk tab laporan yang tidak punya bilah filter sendiri
// (Ringkasan Cuti, Histori Cuti) dan juga dipakai halaman Log Sistem. Tombolnya memakai gaya yang
// sama dengan bilah ekspor Laporan Absen (kelas lpr-export-*, lihat ReportFilterBar.css).
//
// Contoh pemakaian:
// <ReportExportBar caption="Ekspor mengikuti baris yang tampil" formats={['csv']}
//   exportingKey={exportingKey} onExport={handleExport} />
import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { EXPORT_FORMATS } from '../config/laporanConfig';
import './ReportExportBar.css';
import './ReportFilterBar.css'; // kelas lpr-export-btn / lpr-export-caption

const EXPORT_ICONS = { sheet: FileSpreadsheet, text: FileText, pdf: FileText };

export default function ReportExportBar({ caption, formats, exportingKey, isDisabled = false, onExport }) {
  const availableFormats = EXPORT_FORMATS.filter((format) => formats.includes(format.key));

  return (
    <section className="lpr-export-bar">
      <p className="lpr-export-caption">{caption}</p>
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
    </section>
  );
}
