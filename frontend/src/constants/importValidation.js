// src/constants/importValidation.js
//
// [BARU] Istilah baku & aturan penilaian untuk alur Pre-flight Validation pada semua import
// di panel /devAccess (karyawan, saldo cuti, riwayat cuti). Semua teks status ada di sini supaya
// konsisten di seluruh UI dan mudah diganti ke bahasa Indonesia bila diperlukan.
//
// Contoh pemakaian:
//   const verdict = getValidationVerdict(summary);            // 'passed' | 'partial' | 'failed'
//   const text = getVerdictText(verdict, summary, 'validation');

// Nilai status baris yang dikirim backend (ImportRowResult).
export const ROW_STATUS_SUCCESS = 'BERHASIL';
export const ROW_STATUS_SKIPPED = 'DILEWATI';
// [BARU] Peringatan pencocokan data (riwayat cuti): total kuota - terpakai - hangus != sisa di file.
// Bukan baris data: tidak ikut hitungan Total / Valid / Skipped.
export const ROW_STATUS_MISMATCH = 'TIDAK_SESUAI';

export const VALIDATION_VERDICT = {
  passed: 'passed', // semua baris valid
  partial: 'partial', // sebagian baris valid, sisanya Row Skipped
  failed: 'failed', // tidak ada baris valid -> import diblokir
};

export const IMPORT_PHASE = {
  validation: 'validation', // sebelum import: hanya pemeriksaan
  result: 'result', // setelah import sungguhan
};

// Istilah yang dipakai di UI (satu sumber).
export const IMPORT_TERMS = {
  validationSummary: 'Validation Summary',
  importSummary: 'Import Summary',
  skippedLog: 'Skipped Records Log',
  rowSkipped: 'Row Skipped',
  rowValid: 'Valid',
  totalRecords: 'Total Records',
  validRecords: 'Valid Records',
  importedRecords: 'Imported Records',
  skippedRecords: 'Skipped Records',
};

// Menilai hasil validasi/import dari angka ringkasan backend.
export const countMismatch = (rows) => (rows ?? []).filter((row) => row.status === ROW_STATUS_MISMATCH).length;

export const getValidationVerdict = ({ total, success, skipped, rows }) => {
  if (!total || success === 0) return VALIDATION_VERDICT.failed;
  return skipped > 0 || countMismatch(rows) > 0 ? VALIDATION_VERDICT.partial : VALIDATION_VERDICT.passed;
};

const VALIDATION_TEXT = {
  [VALIDATION_VERDICT.passed]: ({ total }) => ({
    title: 'Pre-flight Validation Passed',
    badge: 'Safe to Import',
    description: `Seluruh ${total} baris lolos validasi dan aman diimpor.`,
  }),
  [VALIDATION_VERDICT.partial]: ({ total, success, skipped, rows }) => {
    const mismatch = countMismatch(rows);
    if (skipped === 0) {
      return {
        title: 'Data Mismatch Detected',
        badge: 'Needs Review',
        description:
          `${mismatch} karyawan memiliki data tidak sesuai (total kuota - terpakai - hangus tidak sama dengan sisa di file). `
          + 'Periksa Mismatch Scan di bawah; import tetap bisa dilanjutkan.',
      };
    }
    return {
      title: 'Data Integrity Check Failed',
      badge: 'Contains Errors',
      description:
        `${skipped} dari ${total} baris tidak lolos validasi dan akan dilewati (Row Skipped). `
        + `${success} baris lainnya aman diimpor.`
        + (mismatch > 0 ? ` Selain itu ${mismatch} karyawan datanya tidak sesuai (Mismatch Scan).` : ''),
    };
  },
  [VALIDATION_VERDICT.failed]: ({ total }) => ({
    title: 'Data Integrity Check Failed',
    badge: 'Contains Errors',
    description:
      total === 0
        ? 'File tidak berisi baris data yang dapat divalidasi. Import diblokir.'
        : 'Tidak ada baris yang lolos validasi. Import diblokir sampai file diperbaiki.',
  }),
};

const RESULT_TEXT = {
  [VALIDATION_VERDICT.passed]: ({ success }) => ({
    title: 'Import Completed',
    badge: 'Completed',
    description: `${success} baris berhasil diimpor ke database.`,
  }),
  [VALIDATION_VERDICT.partial]: ({ success, skipped, rows }) => {
    const mismatch = countMismatch(rows);
    if (skipped === 0) {
      return {
        title: 'Import Completed with Data Mismatch',
        badge: 'Completed, Needs Review',
        description: `${success} baris berhasil diimpor. ${mismatch} karyawan datanya tidak sesuai (lihat Mismatch Scan).`,
      };
    }
    return {
      title: 'Import Completed with Skipped Rows',
      badge: 'Completed with Skipped Rows',
      description: `${success} baris berhasil diimpor. ${skipped} baris dilewati (Row Skipped).`
        + (mismatch > 0 ? ` ${mismatch} karyawan datanya tidak sesuai (Mismatch Scan).` : ''),
    };
  },
  [VALIDATION_VERDICT.failed]: () => ({
    title: 'No Records Imported',
    badge: 'Not Imported',
    description: 'Tidak ada baris yang berhasil diimpor. Periksa Skipped Records Log di bawah.',
  }),
};

export const getVerdictText = (verdict, summary, phase) => {
  const source = phase === IMPORT_PHASE.result ? RESULT_TEXT : VALIDATION_TEXT;
  return source[verdict](summary);
};
