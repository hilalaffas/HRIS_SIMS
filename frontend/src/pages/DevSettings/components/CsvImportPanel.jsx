// src/pages/DevSettings/components/CsvImportPanel.jsx
//
// [BARU] Panel import CSV/Excel yang dipakai ulang oleh import karyawan, saldo cuti, dan riwayat cuti.
// [UBAH] Alur sekarang WAJIB lewat Pre-flight Validation sebelum data disimpan:
//
//   pilih / seret file
//     -> "Jalankan Pre-flight Validation"  (backend dryRun: semua aturan diperiksa, TIDAK ada yang disimpan)
//     -> tinjau Validation Summary + Skipped Records Log (ImportValidationReport)
//     -> setujui secara eksplisit ("Setujui & Mulai Import"; bila ada Row Skipped, centang pernyataan dulu)
//     -> import sungguhan (layar loading) -> Import Summary + log baris yang dilewati
//
// Tombol import langsung sudah dihapus. Server juga menolak import yang tidak didahului validasi
// untuk isi file yang sama (ImportValidationRegistry), jadi alur ini tidak bisa dilewati lewat API.
//
// Props penting:
//   onValidate(csvText, file)  WAJIB. Memanggil backend dengan dryRun = true; mengembalikan
//                              { total, success, skipped, rows, notes }.
//   onImport(csvText, file)    Memanggil backend dengan dryRun = false; bentuk respons sama.
//   validationKey              Teks yang berubah bila opsi yang memengaruhi hasil berubah (mis. kotak centang
//                              "terapkan sisa cuti"). Bila berubah setelah validasi, hasil validasi dianggap
//                              kedaluwarsa dan pengguna harus memvalidasi ulang.
// [UBAH] acceptXlsx = true -> file Excel (.xlsx) juga diterima. Untuk .xlsx, csvText kosong dan file
// aslinya dikirim lewat argumen kedua (komentar sel hanya bisa dibaca dari file asli, bukan CSV).
//
// Contoh pemakaian:
//   <CsvImportPanel title="Import karyawan" templateHref="/templates/template-import-karyawan.csv"
//     exampleHref="/templates/contoh-import-karyawan.csv"
//     onValidate={(csv) => importEmployeesCsv(csv, password, true)}
//     onImport={(csv) => importEmployeesCsv(csv, password, false)} />
import React, { useRef, useState } from 'react';
import { IMPORT_PHASE, VALIDATION_VERDICT, getValidationVerdict } from '../../../constants/importValidation';
import {
  MAX_CSV_FILE_BYTES,
  buildImportReportCsv,
  downloadTextFile,
  getTodayStamp,
  readFileAsText,
} from '../../../utils/csvFile';
import { CloudUploadIcon, FileCsvIcon, UploadIcon } from './DevDataIcons';
import DevLoadingOverlay from './DevLoadingOverlay';
import ImportValidationReport from './ImportValidationReport';
import './DevDataSections.css';

const STEP = {
  idle: 'idle',
  validating: 'validating',
  review: 'review',
  importing: 'importing',
};

export default function CsvImportPanel({
  title,
  description,
  templateHref,
  exampleHref,
  extraFields = null,
  keyLabel = 'Username', // [BARU] judul kolom kunci di tabel log (mis. "Karyawan")
  acceptXlsx = false, // [BARU] izinkan file Excel (.xlsx)
  extraLinks = [], // [BARU] tautan unduhan tambahan: [{ href, label }]
  dropzoneHint = 'Pemisah kolom titik koma (;), maksimal 2 MB', // [UBAH] bisa diganti per pemakaian
  canImport = true,
  blockedReason = '',
  validationKey = '', // [BARU]
  loadingMessage = 'Mengimpor data...',
  validatingMessage = 'Menjalankan Pre-flight Validation...', // [BARU]
  onValidate, // [BARU] menggantikan onPreview
  onImport,
  onImported,
}) {
  const fileInputRef = useRef(null);
  const busyRef = useRef(false); // [BARU] gerbang sinkron anti klik ganda (state saja terlambat satu render)
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); // [BARU] file asli (dipakai untuk .xlsx)
  const [step, setStep] = useState(STEP.idle);
  const [isDragging, setIsDragging] = useState(false);
  const [validation, setValidation] = useState(null); // [BARU] hasil Pre-flight Validation
  const [validatedKey, setValidatedKey] = useState(''); // [BARU] validationKey saat validasi dijalankan
  const [isAcknowledged, setIsAcknowledged] = useState(false); // [BARU] pernyataan "saya paham N baris dilewati"
  const [result, setResult] = useState(null);
  const [expectedSkipped, setExpectedSkipped] = useState(null); // [BARU] Row Skipped saat validasi
  const [errorMessage, setErrorMessage] = useState('');

  const clearFile = () => {
    setFileName('');
    setCsvText('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetReview = () => {
    setValidation(null);
    setIsAcknowledged(false);
    setExpectedSkipped(null);
  };

  const loadFile = async (file) => {
    setResult(null);
    resetReview();
    setErrorMessage('');
    setStep(STEP.idle);
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
    if (step === STEP.validating || step === STEP.importing) return;
    loadFile(event.dataTransfer.files?.[0]);
  };

  // [BARU] Langkah 1: Pre-flight Validation (dryRun di backend, tidak ada yang disimpan).
  const handleRunValidation = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setStep(STEP.validating);
    setErrorMessage('');
    setResult(null);
    resetReview();
    try {
      const data = await onValidate(csvText, selectedFile);
      setValidation(data);
      setValidatedKey(validationKey);
      setStep(STEP.review);
    } catch (error) {
      setErrorMessage(error?.message || 'Pre-flight Validation gagal. Coba lagi.');
      setStep(STEP.idle);
    } finally {
      busyRef.current = false;
    }
  };

  // [UBAH] Langkah 2: import sungguhan, hanya dari tahap review setelah disetujui.
  const handleApproveImport = async () => {
    if (busyRef.current || step !== STEP.review) return;
    busyRef.current = true;
    const skippedAtValidation = validation?.skipped ?? 0;
    setStep(STEP.importing);
    setErrorMessage('');
    try {
      const data = await onImport(csvText, selectedFile);
      setExpectedSkipped(skippedAtValidation);
      setResult(data);
      setValidation(null);
      setIsAcknowledged(false);
      clearFile();
      if (onImported) onImported(data);
      setStep(STEP.idle);
    } catch (error) {
      // Server memakai satu kali persetujuan validasi, jadi pengguna harus memvalidasi ulang.
      setErrorMessage(error?.message || 'Import gagal. Jalankan Pre-flight Validation ulang.');
      resetReview();
      setStep(STEP.idle);
    } finally {
      busyRef.current = false;
    }
  };

  const handleCancelReview = () => {
    resetReview();
    setStep(STEP.idle);
  };

  const isBusy = step === STEP.validating || step === STEP.importing;
  const canValidate = Boolean(selectedFile) && canImport && step === STEP.idle;

  // Hasil validasi yang dibuat dengan opsi berbeda dari opsi sekarang tidak boleh disetujui.
  const isStale = Boolean(validation) && validatedKey !== validationKey;
  const verdict = validation ? getValidationVerdict(validation) : null;
  const hasSkippedRows = Boolean(validation) && validation.skipped > 0;
  const isImportBlocked = verdict === VALIDATION_VERDICT.failed;
  const isApprovalReady = step === STEP.review && !isImportBlocked && !isStale && canImport
    && (!hasSkippedRows || isAcknowledged);

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
          disabled={isBusy}
        />
        <CloudUploadIcon />
        <span className="devdata-dropzone__text">
          {fileName || (acceptXlsx ? 'Klik untuk memilih file Excel (.xlsx) atau CSV, atau seret ke sini' : 'Klik untuk memilih file CSV, atau seret ke sini')}
        </span>
        <span className="devdata-dropzone__hint">{dropzoneHint}</span>
      </label>

      {step !== STEP.review && (
        <div className="devdata-actions">
          <button
            type="button"
            className="devdata-btn devdata-btn--primary"
            onClick={handleRunValidation}
            disabled={!canValidate}
          >
            <UploadIcon className={step === STEP.validating ? 'is-busy' : ''} />
            Jalankan Pre-flight Validation
          </button>
          {!canImport && blockedReason && <span className="devsettings-hint">{blockedReason}</span>}
        </div>
      )}

      {errorMessage && <p className="devsettings-error">{errorMessage}</p>}

      {validation && (
        <>
          <ImportValidationReport
            summary={validation}
            phase={IMPORT_PHASE.validation}
            keyLabel={keyLabel}
          />

          <div className="devdata-confirm" role="group" aria-label="Persetujuan import">
            {isImportBlocked && (
              <p>
                Import diblokir karena tidak ada baris yang lolos validasi. Perbaiki file sesuai Skipped Records Log,
                lalu pilih ulang file dan jalankan validasi lagi.
              </p>
            )}

            {isStale && (
              <p>Opsi import berubah setelah validasi. Jalankan Pre-flight Validation ulang sebelum melanjutkan.</p>
            )}

            {!isImportBlocked && !isStale && (
              <p>
                Tinjau Validation Summary di atas. Data baru disimpan ke database setelah Anda menyetujui import
                {hasSkippedRows ? `; ${validation.skipped} baris berstatus Row Skipped tidak akan diimpor` : ''}.
              </p>
            )}

            {hasSkippedRows && !isImportBlocked && !isStale && (
              <label className="devdata-check">
                <input
                  type="checkbox"
                  checked={isAcknowledged}
                  onChange={(event) => setIsAcknowledged(event.target.checked)}
                />
                <span>
                  Saya telah meninjau Skipped Records Log dan memahami bahwa {validation.skipped} baris tidak akan
                  diimpor.
                </span>
              </label>
            )}

            <div className="devdata-actions">
              {!isImportBlocked && (
                <button
                  type="button"
                  className="devdata-btn devdata-btn--primary"
                  onClick={handleApproveImport}
                  disabled={!isApprovalReady}
                >
                  <UploadIcon /> Setujui &amp; Mulai Import ({validation.success} baris)
                </button>
              )}
              <button type="button" className="devdata-btn" onClick={handleRunValidation} disabled={!selectedFile || !canImport}>
                Validasi Ulang
              </button>
              <button type="button" className="devdata-btn" onClick={handleCancelReview}>
                Batalkan
              </button>
            </div>
          </div>
        </>
      )}

      {result && (
        <>
          <ImportValidationReport
            summary={result}
            phase={IMPORT_PHASE.result}
            keyLabel={keyLabel}
            expectedSkipped={expectedSkipped}
          />
          <button
            type="button"
            className="devdata-btn"
            onClick={() => downloadTextFile(`laporan-import-${getTodayStamp()}.csv`, buildImportReportCsv(result.rows))}
          >
            Unduh laporan lengkap
          </button>
        </>
      )}

      {step === STEP.validating && <DevLoadingOverlay message={validatingMessage} />}
      {step === STEP.importing && <DevLoadingOverlay message={loadingMessage} />}
    </div>
  );
}
