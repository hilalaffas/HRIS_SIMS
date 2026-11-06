// src/utils/csvFile.js
//
// [BARU] Pembantu file CSV untuk alat dev (/devAccess): baca file yang dipilih, unduh teks
// sebagai file, dan buat laporan hasil import. Pemisah kolom yang dipakai ';' + BOM UTF-8
// supaya langsung terbuka rapi di Excel (locale Indonesia).

export const MAX_CSV_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

const CSV_BOM = '\uFEFF';

export const readFileAsText = (file) => file.text();

// [UBAH] Tanggal LOKAL (yyyy-MM-dd). Dulu toISOString() (UTC) sehingga pagi hari di WIB
// (sebelum 07.00) memberi tanggal kemarin pada nama file.
export const getTodayStamp = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

export function downloadTextFile(fileName, text) {
  // [UBAH] BOM UTF-8 wajib ada di awal file. response.text() di browser MEMBUANG BOM yang dikirim
  // backend, sehingga tanpa baris ini Excel membaca file sebagai Windows-1252 dan huruf Jepang
  // (項番, 氏名/残日数, ...) menjadi "é…ç•ª".
  const content = text.startsWith(CSV_BOM) ? text : CSV_BOM + text;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// [UBAH] Sel berawalan = + - @ (atau tab/CR) dianggap rumus oleh Excel. Teks laporan memuat isi file
// yang diunggah (nama, komentar sel), jadi diberi awalan ' supaya tidak pernah dieksekusi.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

// [BARU] Unduh file biner (mis. .xlsx) dari Blob.
export function downloadBlobFile(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const escapeCell = (value) => {
  const raw = typeof value === 'string' && FORMULA_PREFIX.test(value) ? `'${value}` : value;
  const text = String(raw ?? '');
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// rows: [{ row, key, status, message }] dari respons import backend.
export function buildImportReportCsv(rows) {
  const lines = [['baris', 'kunci', 'status', 'keterangan']];
  rows.forEach((item) => lines.push([item.row, item.key, item.status, item.message]));
  return CSV_BOM + lines.map((line) => line.map(escapeCell).join(';')).join('\r\n') + '\r\n';
}
