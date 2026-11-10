// src/pages/DevSettings/components/ImportValidationReport.jsx
//
// [BARU] Laporan Pre-flight Validation (phase "validation") dan hasil import sungguhan
// (phase "result") yang dipakai CsvImportPanel. Isinya:
//   1. Banner status  : Pre-flight Validation Passed / Data Integrity Check Failed
//   2. Ringkasan      : Validation Summary (Total / Valid / Skipped) + catatan dari backend
//   3. Skipped Records Log : baris yang dilewati beserta alasannya (bisa diunduh sebagai CSV)
//   4. (opsional) daftar baris valid dalam <details> yang bisa dibuka
//
// Props:
//   summary          { total, success, skipped, rows, notes } dari backend
//   phase            'validation' | 'result' (lihat constants/importValidation.js)
//   keyLabel         judul kolom "Record" (mis. "Karyawan", "Username")
//   expectedSkipped  (phase result) jumlah Row Skipped saat validasi, untuk deteksi data berubah
//
// Contoh pemakaian:
//   <ImportValidationReport summary={validation} phase="validation" keyLabel="Username" />
import React from 'react';
import {
  ROW_STATUS_MISMATCH,
  IMPORT_PHASE,
  IMPORT_TERMS,
  ROW_STATUS_SKIPPED,
  ROW_STATUS_SUCCESS,
  VALIDATION_VERDICT,
  getValidationVerdict,
  getVerdictText,
} from '../../../constants/importValidation';
import { buildImportReportCsv, downloadTextFile, getTodayStamp } from '../../../utils/csvFile';
import { ShieldAlertIcon, ShieldCheckIcon, ShieldXIcon } from './DevDataIcons';
import './ImportValidationReport.css';

const MAX_VISIBLE_ROWS = 200;

const VERDICT_ICON = {
  [VALIDATION_VERDICT.passed]: ShieldCheckIcon,
  [VALIDATION_VERDICT.partial]: ShieldAlertIcon,
  [VALIDATION_VERDICT.failed]: ShieldXIcon,
};

export default function ImportValidationReport({
  summary,
  phase = IMPORT_PHASE.validation,
  keyLabel = 'Record',
  expectedSkipped = null,
}) {
  const isValidationPhase = phase === IMPORT_PHASE.validation;
  const verdict = getValidationVerdict(summary);
  const text = getVerdictText(verdict, summary, phase);
  const VerdictIcon = VERDICT_ICON[verdict];

  const rows = summary.rows ?? [];
  const skippedRows = rows.filter((row) => row.status === ROW_STATUS_SKIPPED);
  const validRows = rows.filter((row) => row.status === ROW_STATUS_SUCCESS);
  const mismatchRows = rows.filter((row) => row.status === ROW_STATUS_MISMATCH); // [BARU]

  // Hasil import sungguhan bisa berbeda dari validasi bila data berubah di antaranya.
  const hasDrifted = !isValidationPhase && expectedSkipped !== null && summary.skipped > expectedSkipped;

  const logFilePrefix = isValidationPhase ? 'validation-skipped-log' : 'import-skipped-log';

  return (
    <section className={`importreport importreport--${verdict}`} aria-live="polite">
      <header className="importreport__banner" role={verdict === VALIDATION_VERDICT.passed ? 'status' : 'alert'}>
        <span className="importreport__icon">
          <VerdictIcon />
        </span>
        <div className="importreport__headline">
          <h4 className="importreport__title">{text.title}</h4>
          <p className="importreport__desc">{text.description}</p>
        </div>
        <span className="importreport__badge">{text.badge}</span>
      </header>

      <div className="importreport__block">
        <h5 className="importreport__heading">
          {isValidationPhase ? IMPORT_TERMS.validationSummary : IMPORT_TERMS.importSummary}
        </h5>
        <dl className="importreport__stats">
          <div className="importreport__stat" style={{ '--stat-delay': '0ms' }}>
            <dt>{IMPORT_TERMS.totalRecords}</dt>
            <dd>{summary.total}</dd>
          </div>
          <div className="importreport__stat importreport__stat--ok" style={{ '--stat-delay': '70ms' }}>
            <dt>{isValidationPhase ? IMPORT_TERMS.validRecords : IMPORT_TERMS.importedRecords}</dt>
            <dd>{summary.success}</dd>
          </div>
          <div
            className={`importreport__stat${summary.skipped > 0 ? ' importreport__stat--warn' : ''}`}
            style={{ '--stat-delay': '140ms' }}
          >
            <dt>{IMPORT_TERMS.skippedRecords}</dt>
            <dd>{summary.skipped}</dd>
          </div>
        </dl>

        {summary.notes?.length > 0 && (
          <ul className="devdata-notes">
            {summary.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {hasDrifted && (
          <p className="importreport__drift" role="alert">
            Data berubah sejak validasi: {summary.skipped - expectedSkipped} baris tambahan dilewati saat import
            (validasi: {expectedSkipped}, import: {summary.skipped}). Tinjau log di bawah.
          </p>
        )}
      </div>

      {skippedRows.length > 0 && (
        <div className="importreport__block">
          <h5 className="importreport__heading">
            {IMPORT_TERMS.skippedLog} <span className="importreport__count">{skippedRows.length}</span>
          </h5>
          <p className="devsettings-hint">
            Baris berikut berstatus <strong>{IMPORT_TERMS.rowSkipped}</strong> dan tidak akan masuk ke database.
          </p>
          <div className="devdata-table-wrap">
            <table className="devdata-table importreport__table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Baris File</th>
                  <th>{keyLabel}</th>
                  <th>Alasan</th>
                </tr>
              </thead>
              <tbody>
                {skippedRows.slice(0, MAX_VISIBLE_ROWS).map((row, index) => (
                  <tr key={`${row.row}-${row.key}-${index}`} style={{ '--row-delay': `${Math.min(index, 12) * 25}ms` }}>
                    <td>{index + 1}</td>
                    <td>{row.row}</td>
                    <td>{row.key || '-'}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {skippedRows.length > MAX_VISIBLE_ROWS && (
            <p className="devsettings-hint">
              Menampilkan {MAX_VISIBLE_ROWS} dari {skippedRows.length} baris. Unduh log untuk daftar lengkap.
            </p>
          )}
          <button
            type="button"
            className="devdata-btn"
            onClick={() => downloadTextFile(`${logFilePrefix}-${getTodayStamp()}.csv`, buildImportReportCsv(skippedRows))}
          >
            Unduh Skipped Records Log (CSV)
          </button>
        </div>
      )}

      {/* [UBAH] Peringatan data file (sisa kosong/tidak terbaca, baris tidak ikut dihitung) */}
      {mismatchRows.length > 0 && (
        <div className="importreport__block">
          <h5 className="importreport__heading">
            Peringatan Data <span className="importreport__count">{mismatchRows.length}</span>
          </h5>
          <p className="devsettings-hint">
            Karyawan berikut punya <strong>peringatan data</strong> pada file (sisa cuti kosong/tidak terbaca, atau ada baris yang tidak
            ikut dihitung). Angka ringkasan mengikuti Excel apa adanya. Import tetap bisa dilanjutkan.
          </p>
          <div className="devdata-table-wrap">
            <table className="devdata-table importreport__table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>{keyLabel}</th>
                  <th>Rincian</th>
                </tr>
              </thead>
              <tbody>
                {mismatchRows.slice(0, MAX_VISIBLE_ROWS).map((row, index) => (
                  <tr key={`${row.key}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{row.key || '-'}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="devdata-btn"
            onClick={() => downloadTextFile(`${logFilePrefix.replace('skipped-log', 'mismatch-log')}-${getTodayStamp()}.csv`, buildImportReportCsv(mismatchRows))}
          >
            Unduh Mismatch Log (CSV)
          </button>
        </div>
      )}

      {validRows.length > 0 && (
        <details className="importreport__details">
          <summary>
            Lihat {validRows.length} baris {isValidationPhase ? 'yang akan diimpor' : 'yang berhasil diimpor'}
          </summary>
          <div className="devdata-table-wrap">
            <table className="devdata-table importreport__table">
              <thead>
                <tr>
                  <th>Baris File</th>
                  <th>{keyLabel}</th>
                  <th>{IMPORT_TERMS.rowValid}</th>
                </tr>
              </thead>
              <tbody>
                {validRows.slice(0, MAX_VISIBLE_ROWS).map((row, index) => (
                  <tr key={`${row.row}-${row.key}-${index}`}>
                    <td>{row.row}</td>
                    <td>{row.key || '-'}</td>
                    <td>{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validRows.length > MAX_VISIBLE_ROWS && (
            <p className="devsettings-hint">
              Menampilkan {MAX_VISIBLE_ROWS} dari {validRows.length} baris.
            </p>
          )}
        </details>
      )}
    </section>
  );
}
