// src/pages/Laporan/utils/attendanceReportExport.js
//
// [BARU] Ekspor XLSX laporan absensi: SATU karyawan = SATU file Excel.
//   - 1 karyawan   -> diunduh langsung sebagai satu file .xlsx
//   - >1 karyawan  -> semua file .xlsx dibungkus dalam satu file .zip
// Jumlah karyawan mengikuti filter yang sedang aktif di tab Laporan Absen (divisi + pencarian),
// jadi ZIP hanya berisi karyawan yang tampil di hasil filter.
//
// Di-import dinamis (lazy) dari AttendanceReportTab supaya library Excel & ZIP hanya diunduh
// saat tombol "Unduh XLSX" diklik.
//
// Contoh pemakaian:
//   await downloadAttendanceXlsx({ reports, periodLabel: range.label, fileKey: range.fileKey, zipFileName });
import { downloadBlobFile } from '../../../utils/csvFile';
import { buildSheetXlsxBlob } from '../../../utils/attendanceReportXlsx';
import { buildZipBlob } from '../../../utils/zipFile';
import { buildEmployeeFileBaseName, buildEmployeeXlsxSheet } from './attendanceReportSheets';

const FILE_NAME_PREFIX = 'laporan-absensi';

// Satu laporan karyawan -> { name: "laporan-absensi_<nik>_<nama>_<periode>.xlsx", blob }.
async function buildEmployeeXlsxFile(report, { periodLabel, fileKey }) {
  const sheet = buildEmployeeXlsxSheet(report, { periodLabel });
  return {
    name: `${FILE_NAME_PREFIX}_${buildEmployeeFileBaseName(report)}_${fileKey}.xlsx`,
    blob: await buildSheetXlsxBlob(sheet),
  };
}

// zipFileName: nama file ZIP tanpa ekstensi (dipakai bila karyawan > 1).
export async function downloadAttendanceXlsx({ reports, periodLabel, fileKey, zipFileName }) {
  const files = [];
  // Berurutan (bukan Promise.all) supaya memori & CPU browser tetap ringan untuk ratusan karyawan.
  for (const report of reports) {
    files.push(await buildEmployeeXlsxFile(report, { periodLabel, fileKey }));
  }

  if (files.length === 1) {
    downloadBlobFile(files[0].name, files[0].blob);
    return;
  }
  downloadBlobFile(`${zipFileName}.zip`, await buildZipBlob(files));
}
