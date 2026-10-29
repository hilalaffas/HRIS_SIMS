// File: src/utils/csvExport.js
// Helper umum untuk ekspor CSV. Dipakai halaman Karyawan (per tab menu),
// tapi sengaja dibuat generik supaya halaman lain bisa memakainya juga.

// BOM (\uFEFF) agar Excel membaca karakter UTF-8 dengan benar.
const CSV_BOM = '\uFEFF';

// Sel yang diawali karakter ini bisa dibaca Excel sebagai rumus (CSV injection),
// jadi diberi awalan apostrof supaya tetap terbaca sebagai teks biasa.
const FORMULA_PREFIX_PATTERN = /^[=+@\t\r]/;

export const escapeCsv = (value, fallback = '-') => {
  const isEmpty = value === null || value === undefined || value === '';
  let text = isEmpty ? fallback : String(value);
  if (FORMULA_PREFIX_PATTERN.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

// [UBAH] Bagian "buat Blob lalu picu unduhan" dipisah jadi satu fungsi supaya
// dipakai bersama downloadCsv & downloadCsvSections. Perilaku downloadCsv tidak berubah.
const saveCsvFile = (csvContent, fileNamePrefix) => {
  const blob = new Blob([CSV_BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];

  link.href = url;
  link.download = `${fileNamePrefix}_${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadCsv = ({ headers, rows, fileNamePrefix }) => {
  const csvContent = [
    headers.map((header) => escapeCsv(header)).join(','),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')),
  ].join('\n');

  saveCsvFile(csvContent, fileNamePrefix);
};

// [BARU] Satu file CSV berisi BEBERAPA blok ("sheet"), dipisah dua baris kosong.
// CSV tidak mengenal sheet, jadi tiap blok diawali baris judul (+ subjudul),
// baris header kolom, data, dan baris penutup opsional (footer).
// sections: [{ title, subtitle?, headers, rows, footer? }]
export const downloadCsvSections = ({ sections, fileNamePrefix }) => {
  const lines = [];
  sections.forEach((section, index) => {
    if (index > 0) lines.push('', '');
    lines.push(escapeCsv(section.title));
    if (section.subtitle) lines.push(escapeCsv(section.subtitle));
    lines.push(section.headers.map((header) => escapeCsv(header)).join(','));
    section.rows.forEach((row) => lines.push(row.map((cell) => escapeCsv(cell)).join(',')));
    if (section.footer) lines.push(escapeCsv(section.footer));
  });

  saveCsvFile(lines.join('\n'), fileNamePrefix);
};
