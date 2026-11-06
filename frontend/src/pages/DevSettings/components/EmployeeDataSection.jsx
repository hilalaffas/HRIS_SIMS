// src/pages/DevSettings/components/EmployeeDataSection.jsx
//
// [BARU] Import & export data karyawan (CSV) di panel /devAccess.
// Import murni MENAMBAH karyawan baru: username yang sudah ada dilewati (tidak ditimpa).
// Semua akun baru memakai satu password default yang diisi di sini.
//
// Contoh pemakaian: <EmployeeDataSection />
import React, { useState } from 'react';
import { exportEmployeesCsv, importEmployeesCsv } from '../../../services/devToolsService';
import CsvExportButton from './CsvExportButton';
import CsvImportPanel from './CsvImportPanel';
import './DevDataSections.css';

const MIN_PASSWORD_LENGTH = 4;

export default function EmployeeDataSection() {
  const [defaultPassword, setDefaultPassword] = useState('');

  const isPasswordValid = defaultPassword.length >= MIN_PASSWORD_LENGTH;

  const passwordField = (
    <div className="devdata-field">
      <label htmlFor="devDefaultPassword">Password default akun baru</label>
      <input
        id="devDefaultPassword"
        type="password"
        autoComplete="new-password"
        value={defaultPassword}
        onChange={(event) => setDefaultPassword(event.target.value)}
        placeholder={`Minimal ${MIN_PASSWORD_LENGTH} karakter`}
      />
      <small className="devsettings-hint">
        Dipakai untuk semua karyawan baru dari file ini. Minta karyawan menggantinya setelah login pertama.
      </small>
    </div>
  );

  return (
    <section className="devdata-section">
      <h2 className="devdata-title">Data Karyawan</h2>

      <div className="devdata-block">
        <h3 className="devdata-subtitle">Export</h3>
        <p className="devsettings-hint">
          Unduh seluruh data karyawan (tanpa password) dengan kolom yang sama seperti template import.
        </p>
        <div className="devdata-actions">
          <CsvExportButton
            label="Export data karyawan"
            fileNamePrefix="data-karyawan"
            fetchCsv={exportEmployeesCsv}
          />
        </div>
      </div>

      <div className="devdata-block">
        <CsvImportPanel
          title="Import karyawan baru"
          description="Username yang sudah ada, divisi/role yang tidak dikenal, atau data tidak valid dilewati tanpa menimpa data lama. NIK dikosongkan = dibuat otomatis."
          templateHref="/templates/template-import-karyawan.csv"
          exampleHref="/templates/contoh-import-karyawan.csv"
          extraFields={passwordField}
          canImport={isPasswordValid}
          blockedReason={`Isi password default (minimal ${MIN_PASSWORD_LENGTH} karakter) dulu.`}
          loadingMessage="Mengimpor data karyawan..."
          onValidate={(csvText) => importEmployeesCsv(csvText, defaultPassword, true)} // [BARU]
          onImport={(csvText) => importEmployeesCsv(csvText, defaultPassword, false)} // [UBAH]
        />
      </div>
    </section>
  );
}
