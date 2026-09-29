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

export const downloadCsv = ({ headers, rows, fileNamePrefix }) => {
  const csvContent = [
    headers.map((header) => escapeCsv(header)).join(','),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell)).join(',')),
  ].join('\n');

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
