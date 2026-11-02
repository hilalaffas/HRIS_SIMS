// src/pages/Laporan/components/ReportFilterBar.jsx
//
// [BARU] Bilah filter & ekspor Laporan Absen:
//   - rentang laporan (slot `rangeControl`): per periode tutup buku, hari ini, atau
//     tanggal pilihan -- lihat ReportRangeControl
//   - pilihan divisi (Semua Divisi / satu divisi) = CAKUPAN tabel DAN ekspor
//   - pencarian nama / NIK (hanya menyaring tampilan tabel, bukan isi ekspor)
//   - tombol Unduh XLSX / CSV / PDF (satu karyawan = satu sheet)
//
// Contoh pemakaian:
// <ReportFilterBar rangeControl={<ReportRangeControl ... />} divisionOptions={options} ... onExport={handleExport} />
import React from 'react';
import { FileDown, FileSpreadsheet, FileText, Search } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import { EXPORT_FORMATS } from '../config/laporanConfig';
import './ReportFilterBar.css';

const EXPORT_ICONS = { sheet: FileSpreadsheet, text: FileText, pdf: FileDown };

export default function ReportFilterBar({
  rangeControl,
  divisionOptions,
  divisionId,
  onDivisionChange,
  searchValue,
  onSearchChange,
  scopeLabel,
  employeeCount,
  exportingKind,
  isExportDisabled,
  onExport,
}) {
  return (
    <section className="lpr-filter-card" aria-label="Filter dan ekspor laporan absen">
      <div className="lpr-filter-row">
        <div className="lpr-filter-field lpr-filter-field--range">
          <span className="lpr-filter-label">Rentang Laporan</span>
          {rangeControl}
        </div>

        <div className="lpr-filter-field lpr-filter-field--division">
          <span className="lpr-filter-label">Divisi</span>
          <Dropdown
            value={divisionId}
            onChange={(event) => onDivisionChange(event.target.value)}
            options={divisionOptions}
            variant="pill"
            searchable
            ariaLabel="Pilih divisi laporan"
          />
        </div>

        <label className="lpr-filter-field lpr-filter-field--search">
          <span className="lpr-filter-label">Cari Karyawan</span>
          <span className="lpr-search-box">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Nama atau NIK..."
              maxLength={60}
            />
          </span>
        </label>
      </div>

      <div className="lpr-export-row">
        <p className="lpr-export-caption">
          Ekspor: <strong>{scopeLabel}</strong> · {employeeCount} karyawan · XLSX/PDF satu karyawan per sheet, CSV satu tabel
        </p>
        <div className="lpr-export-actions">
          {EXPORT_FORMATS.map((format) => {
            const Icon = EXPORT_ICONS[format.icon];
            return (
              <button
                key={format.key}
                type="button"
                className={`lpr-export-btn lpr-export-btn--${format.key}`}
                onClick={() => onExport(format.key)}
                disabled={isExportDisabled || Boolean(exportingKind)}
                title={format.hint}
              >
                <Icon aria-hidden="true" />
                {exportingKind === format.key ? 'Menyiapkan...' : `Unduh ${format.label}`}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
