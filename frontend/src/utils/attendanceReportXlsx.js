// File: src/utils/attendanceReportXlsx.js
// [UBAH] Render SATU "sheet" laporan absensi (lihat pages/Laporan/utils/attendanceReportSheets.js,
// buildEmployeeXlsxSheet) menjadi SATU file Excel (.xlsx) milik satu karyawan.
// Sebelumnya: satu file berisi banyak sheet (satu sheet per karyawan) + sheet "Ringkasan",
// dan seluruh sel ditulis sebagai teks.
// Sekarang  : satu file = satu karyawan, dan tiap sel memakai TIPE ASLI Excel
//             (tanggal, jam, durasi, angka) dengan format tampilan lewat `kinds`.
//
// Keamanan: sel teks tetap bertipe String (format "@" = Teks), bukan formula, jadi isi seperti
// "=HYPERLINK(...)" pada nama/catatan TIDAK dijalankan Excel.
// Di-import dinamis (lazy) supaya library Excel hanya diunduh saat user klik "Unduh XLSX".
import writeXlsxFile from 'write-excel-file/browser';
import { EXCEL_FORMATS } from './excelValueConverters';

const COLORS = {
  title: '#1e293b',
  muted: '#64748b',
  headerFill: '#f1f5f9',
  border: '#e2e8f0',
  hadir: '#059669',
  telat: '#b45309',
  sakit: '#4338ca',
  info: '#2563eb',
  alpha: '#e11d48',
};

// Warna teks kolom Status -- sama dengan PDF & badge di layar.
const STATUS_COLORS = {
  'HADIR TEPAT WAKTU': COLORS.hadir,
  TERLAMBAT: COLORS.telat,
  SAKIT: COLORS.sakit,
  IZIN: COLORS.info,
  CUTI: COLORS.info,
  'MENUNGGU APPROVAL': COLORS.telat,
  DITOLAK: COLORS.alpha,
  'TANPA KETERANGAN': COLORS.alpha,
  'BELUM ABSEN': COLORS.muted,
};

const MIN_COLUMN_WIDTH = 8;
const MAX_COLUMN_WIDTH = 46;
const INFO_COLUMN_SPAN = 4; // baris info (NIK, Jabatan, ...) hanya menggabung 4 kolom pertama -> tidak melebar

const border = { borderColor: COLORS.border, borderStyle: 'thin' };

// Lebar tetap untuk kolom bertipe waktu/angka (karakter); kolom teks mengikuti isi terpanjang.
const FIXED_KIND_WIDTHS = {
  date: 12, time: 9, timeSeconds: 11, duration: 10, integer: 8, decimal: 8, hours: 12,
};

// Format tampilan sel + perataan per jenis data. Nilai tetap ANGKA / TANGGAL asli.
const KIND_STYLES = {
  date: { type: Date, format: EXCEL_FORMATS.date, align: 'center' },
  time: { type: Number, format: EXCEL_FORMATS.time, align: 'center' },
  timeSeconds: { type: Number, format: EXCEL_FORMATS.timeSeconds, align: 'center' },
  duration: { type: Number, format: EXCEL_FORMATS.duration, align: 'center' },
  integer: { type: Number, format: EXCEL_FORMATS.integer, align: 'center' },
  decimal: { type: Number, format: EXCEL_FORMATS.decimal, align: 'center' },
  hours: { type: Number, format: EXCEL_FORMATS.hours, align: 'center' },
  currency: { type: Number, format: EXCEL_FORMATS.currency, align: 'right' },
};

// Nilai kosong (null) -> sel kosong, bukan teks "-". `style` = gaya tambahan (mis. bingkai).
const toCell = (value, kind = 'text', style = {}) => {
  if (value === null || value === undefined || value === '') return { value: null, ...style };
  if (kind === 'text' || !KIND_STYLES[kind]) {
    return { value: String(value), type: String, format: EXCEL_FORMATS.text, ...style };
  }
  return { value, ...KIND_STYLES[kind], ...style };
};

const computeColumns = (sheet) => sheet.headers.map((header, index) => {
  const kind = sheet.kinds[index];
  if (FIXED_KIND_WIDTHS[kind]) return { width: Math.max(FIXED_KIND_WIDTHS[kind], String(header).length + 2) };
  const longest = Math.max(
    String(header).length,
    ...sheet.rows.map((row) => String(row[index] ?? '').length),
  );
  return { width: Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longest + 2)) };
});

// [BARU] Baris info di bawah judul: sheet.infoLines (satu baris per item, vertikal);
// bila tidak ada, jatuh kembali ke sheet.subtitle (satu baris) agar kompatibel.
const getInfoLines = (sheet) => sheet.infoLines || [sheet.subtitle];

function buildSheetData(sheet) {
  const columnCount = sheet.headers.length;
  const filler = Array(columnCount - 1).fill(null); // sel yang ikut tergabung (columnSpan)
  const infoSpan = Math.min(INFO_COLUMN_SPAN, columnCount);
  const infoFiller = Array(infoSpan - 1).fill(null);
  const hasStatusColumn = sheet.statusColumn !== null && sheet.statusColumn !== undefined;

  const rows = [
    [{ value: sheet.title, type: String, fontWeight: 'bold', fontSize: 14, textColor: COLORS.title, columnSpan: columnCount }, ...filler],
    ...getInfoLines(sheet).map((line) => (
      [{ value: String(line), type: String, textColor: COLORS.muted, columnSpan: infoSpan }, ...infoFiller]
    )),
    sheet.headers.map((header) => ({
      value: String(header),
      type: String,
      fontWeight: 'bold',
      textColor: COLORS.muted,
      backgroundColor: COLORS.headerFill,
      wrap: true,
      alignVertical: 'center',
      ...border,
    })),
  ];

  sheet.rows.forEach((row) => {
    rows.push(row.map((value, columnIndex) => {
      const kind = sheet.kinds[columnIndex];
      if (hasStatusColumn && columnIndex === sheet.statusColumn && STATUS_COLORS[String(value)]) {
        return toCell(value, kind, { ...border, fontWeight: 'bold', textColor: STATUS_COLORS[String(value)] });
      }
      return toCell(value, kind, border);
    }));
  });

  if (sheet.footer) {
    rows.push([]);
    sheet.footer.forEach(([label, value, kind], index) => {
      const footerRow = Array(columnCount).fill(null);
      footerRow[0] = { value: String(label ?? ''), type: String, fontWeight: index === 0 ? 'bold' : 'normal', textColor: COLORS.title };
      if (columnCount > 1 && value !== null && value !== undefined) {
        footerRow[1] = toCell(value, kind, { textColor: COLORS.title });
      }
      rows.push(footerRow);
    });
  }
  return rows;
}

// Judul + baris info + header kolom dibekukan (freeze) agar tetap terlihat saat menggulir.
const countHeaderRows = (sheet) => 1 + getInfoLines(sheet).length + 1;

// Satu sheet -> Blob .xlsx (satu file untuk satu karyawan).
export const buildSheetXlsxBlob = (sheet) => writeXlsxFile([{
  data: buildSheetData(sheet),
  sheet: sheet.name,
  columns: computeColumns(sheet),
  stickyRowsCount: countHeaderRows(sheet),
  orientation: 'landscape',
}]).toBlob();
