// src/pages/DevSettings/components/CsvImportPanel.jsx
//
// [BARU] Panel import CSV yang dipakai ulang oleh import karyawan dan import cuti:
// pilih / seret file .csv -> konfirmasi -> proses (layar loading buku membalik) -> ringkasan
// + daftar baris yang dilewati beserta alasannya (bisa diunduh sebagai laporan CSV).
//
// onImport(csvText, file) harus mengembalikan { total, success, skipped, rows } dari backend.
// [BARU] onPreview(csvText, file) (opsional) -> tombol "Pratinjau": memanggil backend dengan dryRun sehingga
// hasil pemetaan per baris tampil lebih dulu dan TIDAK ada yang disimpan.
// [UBAH] acceptXlsx = true -> file Excel (.xlsx) juga diterima. Untuk .xlsx, csvText kosong dan file
// aslinya dikirim lewat argumen kedua (komentar sel hanya bisa dibaca dari file asli, bukan CSV).
//
// Contoh pemakaian:
//   <CsvImportPanel title="Import karyawan" templateHref="/templates/template-import-karyawan.csv"
//     exampleHref="/templates/contoh-import-karyawan.csv" onImport={(csv) => importEmployeesCsv(csv, password)} />
import React, { useRef, useState } from 'react';
import {
  MAX_CSV_FILE_BYTES,
  buildImportReportCsv,
  downloadTextFile,
  getTodayStamp,
  readFileAsText,
} from '../../../utils/csvFile';
import { CloudUploadIcon, FileCsvIcon, UploadIcon } from './DevDataIcons';
import DevLoadingOverlay from './DevLoadingOverlay';
import './DevDataSections.css';

const MAX_VISIBLE_SKIPPED_ROWS = 200;
const SUCCESS_STATUS = 'BERHASIL';

export default function CsvImportPanel({
  title,
  description,
  templateHref,
  exampleHref,
  extraFields = null,
  keyLabel = 'Username', // [BARU] judul kolom kunci di tabel baris dilewati (mis. "Karyawan")
  acceptXlsx = false, // [BARU] izinkan file Excel (.xlsx)
  extraLinks = [], // [BARU] tautan unduhan tambahan: [{ href, label }]
  dropzoneHint = 'Pemisah kolom titik koma (;), maksimal 2 MB', // [UBAH] bisa diganti per pemakaian
  canImport = true,
  blockedReason = '',
  loadingMessage = 'Mengimpor data...',
  onImport,
  onPreview = null, // [BARU]
  onImported,
}) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); // [BARU] file asli (dipakai untuk .xlsx)
  const [step, setStep] = useState('idle'); // idle | confirm | running
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null); // [BARU] hasil pratinjau (dry-run)
  const [errorMessage, setErrorMessage] = useState('');

  const clearFile = () => {
    setFileName('');
    setCsvText('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadFile = async (file) => {
    setResult(null);
    setPreview(null);
    setErrorMessage('');
    setStep('idle');
    if (!file) {
      clearFile();
      return;
    }
    const isXlsx = /\.xlsx$/i.test(file.name);
    const isCsv = /\.csv$/i.test(file.name);
    if (!isCsv && !(acceptXlsx && isXlsx)) {
      setErrorMessage(
        acceptXlsx
          ? 'File harus berformat .xlsx (Excel) atau .csv.'
          : 'File harus berformat .csv (simpan dari Excel sebagai "CSV UTF-8").'
      );
      clearFile();
      return;
    }
    if (file.size > MAX_CSV_FILE_BYTES) {
      setErrorMessage('Ukuran file melebihi 2 MB.');
      clearFile();
      return;
    }
    try {
      if (isXlsx) {
        // [BARU] .xlsx adalah arsip zip: harus diawali "PK\x03\x04". Pemeriksaan ulang tetap ada di server.
        const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
        const looksLikeZip = header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
        if (!looksLikeZip) {
          setErrorMessage('Isi file bukan Excel .xlsx yang valid.');
          clearFile();
          return;
        }
        setCsvText('');
      } else {
        setCsvText(await readFileAsText(file));
      }
      setSelectedFile(file);
      setFileName(file.name);
    } catch {
      setErrorMessage('File tidak dapat dibaca. Coba pilih ulang.');
      clearFile();
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (step === 'running') return;
    loadFile(event.dataTransfer.files?.[0]);
  };

  // [BARU] Pratinjau: sama seperti import tetapi dengan dryRun di backend.
  const handleRunPreview = async () => {
    setStep('running');
    setErrorMessage('');
    setResult(null);
    try {
      setPreview(await onPreview(csvText, selectedFile));
    } catch (error) {
      setErrorMessage(error?.message || 'Pratinjau gagal. Coba lagi.');
    } finally {
      setStep('idle');
    }
  };

  const handleRunImport = async () => {
    setStep('running');
    setErrorMessage('');
    setPreview(null);
    try {
      const data = await onImport(csvText, selectedFile);
      setResult(data);
      clearFile();
      if (onImported) onImported(data);
    } catch (error) {
      setErrorMessage(error?.message || 'Import gagal. Coba lagi.');
    } finally {
      setStep('idle');
    }
  };

  const skippedRows = result ? result.rows.filter((row) => row.status !== SUCCESS_STATUS) : [];
  const canSubmit = Boolean(selectedFile) && canImport && step === 'idle'; // [UBAH] dulu Boolean(csvText)

  return (
    <div className="devdata-import">
      <h3 className="devdata-subtitle">{title}</h3>
      {description && <p className="devsettings-hint">{description}</p>}

      <div className="devdata-links">
        <a className="devdata-link" href={templateHref} download>
          <FileCsvIcon /> Unduh template
        </a>
        <a className="devdata-link" href={exampleHref} download>
          <FileCsvIcon /> Unduh contoh terisi
        </a>
        {extraLinks.map((link) => (
          <a key={link.href} className="devdata-link" href={link.href} download>
            <FileCsvIcon /> {link.label}
          </a>
        ))}
      </div>

      {extraFields}

      <label
        className={`devdata-dropzone${isDragging ? ' is-dragging' : ''}${fileName ? ' has-file' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptXlsx ? '.csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : '.csv,text/csv'}
          onChange={(event) => loadFile(event.target.files?.[0])}
          disabled={step === 'running'}
        />
        <CloudUploadIcon />
        <span className="devdata-dropzone__text">
          {fileName || (acceptXlsx ? 'Klik untuk memilih file Excel (.xlsx) atau CSV, atau seret ke sini' : 'Klik untuk memilih file CSV, atau seret ke sini')}
        </span>
        <span className="devdata-dropzone__hint">{dropzoneHint}</span>
      </label>

      {step === 'confirm' ? (
        <div className="devdata-confirm" role="alert">
          <p>
            Import <strong>{fileName}</strong> sekarang? Baris yang valid langsung tersimpan ke database.
          </p>
          <div className="devdata-actions">
            <button type="button" className="devdata-btn devdata-btn--primary" onClick={handleRunImport}>
              <UploadIcon /> Ya, import
            </button>
            <button type="button" className="devdata-btn" onClick={() => setStep('idle')}>
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="devdata-actions">
          <button
            type="button"
            className="devdata-btn devdata-btn--primary"
            onClick={() => setStep('confirm')}
            disabled={!canSubmit}
          >
            <UploadIcon className={step === 'running' ? 'is-busy' : ''} />
            Import
          </button>
          {onPreview && (
            <button type="button" className="devdata-btn" onClick={handleRunPreview} disabled={!canSubmit}>
              Pratinjau
            </button>
          )}
          {!canImport && blockedReason && <span className="devsettings-hint">{blockedReason}</span>}
        </div>
      )}

      {errorMessage && <p className="devsettings-error">{errorMessage}</p>}

      {preview && (
        <div className="devdata-result devdata-result--preview" aria-live="polite">
          <p className="devdata-result__summary">
            <strong>Pratinjau</strong> &mdash; belum ada data yang disimpan. Total <strong>{preview.total}</strong> baris ·{' '}
            <span className="is-success">Akan masuk {preview.success}</span> ·{' '}
            <span className={preview.skipped > 0 ? 'is-warning' : ''}>Dilewati {preview.skipped}</span>
          </p>
          {preview.notes?.length > 0 && (
            <ul className="devdata-notes">
              {preview.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          {preview.rows.length > 0 && (
            <div className="devdata-table-wrap">
              <table className="devdata-table">
                <thead>
                  <tr>
                    <th>Baris</th>
                    <th>{keyLabel}</th>
                    <th>Status</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, MAX_VISIBLE_SKIPPED_ROWS).map((row) => (
                    <tr key={`${row.row}-${row.key}-${row.message}`}>
                      <td>{row.row}</td>
                      <td>{row.key || '-'}</td>
                      <td className={row.status === SUCCESS_STATUS ? 'is-success' : 'is-warning'}>
                        {row.status === SUCCESS_STATUS ? 'Akan masuk' : 'Dilewati'}
                      </td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.rows.length > MAX_VISIBLE_SKIPPED_ROWS && (
            <p className="devsettings-hint">
              Menampilkan {MAX_VISIBLE_SKIPPED_ROWS} dari {preview.rows.length} baris.
            </p>
          )}
          <div className="devdata-actions">
            <button
              type="button"
              className="devdata-btn devdata-btn--primary"
              onClick={() => setStep('confirm')}
              disabled={!canSubmit || preview.success === 0}
            >
              <UploadIcon /> Import sekarang
            </button>
            <button type="button" className="devdata-btn" onClick={() => setPreview(null)}>
              Tutup pratinjau
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="devdata-result" aria-live="polite">
          <p className="devdata-result__summary">
            Total <strong>{result.total}</strong> baris ·{' '}
            <span className="is-success">Berhasil {result.success}</span> ·{' '}
            <span className={result.skipped > 0 ? 'is-warning' : ''}>Dilewati {result.skipped}</span>
          </p>

          {/* [BARU] Catatan ringkas dari backend (mis. jumlah baris 0 hari yang diabaikan) */}
          {result.notes?.length > 0 && (
            <ul className="devdata-notes">
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}

          {skippedRows.length > 0 && (
            <>
              <div className="devdata-table-wrap">
                <table className="devdata-table">
                  <thead>
                    <tr>
                      <th>Baris</th>
                      <th>{keyLabel}</th>
                      <th>Alasan dilewati</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skippedRows.slice(0, MAX_VISIBLE_SKIPPED_ROWS).map((row) => (
                      <tr key={`${row.row}-${row.key}`}>
                        <td>{row.row}</td>
                        <td>{row.key || '-'}</td>
                        <td>{row.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {skippedRows.length > MAX_VISIBLE_SKIPPED_ROWS && (
                <p className="devsettings-hint">
                  Menampilkan {MAX_VISIBLE_SKIPPED_ROWS} dari {skippedRows.length} baris. Unduh laporan untuk daftar lengkap.
                </p>
              )}
            </>
          )}

          <button
            type="button"
            className="devdata-btn"
            onClick={() => downloadTextFile(`laporan-import-${getTodayStamp()}.csv`, buildImportReportCsv(result.rows))}
          >
            Unduh laporan lengkap
          </button>
        </div>
      )}

      {step === 'running' && <DevLoadingOverlay message={loadingMessage} />}
    </div>
  );
}
