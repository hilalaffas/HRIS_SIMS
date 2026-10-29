// File: src/utils/attendanceReportXlsx.js
// [BARU] Render "sheet" laporan absensi (lihat
// pages/Laporan/utils/attendanceReportSheets.js) menjadi file Excel (.xlsx)
// dengan SHEET SUNGGUHAN: satu karyawan = satu sheet, ditambah sheet "Ringkasan".
// Di-import dinamis (lazy) dari tab Laporan Absen supaya library Excel hanya
// diunduh browser saat user benar-benar klik "Unduh XLSX".
//
// Keamanan: semua teks ditulis sebagai tipe String (format "@" = Teks), bukan
// formula, jadi isi seperti "=HYPERLINK(...)" pada nama/catatan TIDAK akan
// dijalankan Excel (tidak perlu awalan apostrof seperti di CSV).
import writeXlsxFile from 'write-excel-file/browser';

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
const HEADER_ROW_COUNT = 3; // judul, subjudul, header kolom -> dibekukan (freeze)

const border = { borderColor: COLORS.border, borderStyle: 'thin' };

const toCell = (value, style = {}) => (
  typeof value === 'number'
    ? { value, type: Number, align: 'center', ...border, ...style }
    : { value: String(value ?? '-'), type: String, format: '@', ...border, ...style }
);

// Lebar kolom (karakter) mengikuti teks terpanjang di header & isi.
const computeColumns = (sheet) => sheet.headers.map((header, index) => {
  const longest = Math.max(
    String(header).length,
    ...sheet.rows.map((row) => String(row[index] ?? '-').length),
  );
  return { width: Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longest + 2)) };
});

function buildSheetData(sheet) {
  const columnCount = sheet.headers.length;
  const filler = Array(columnCount - 1).fill(null); // sel yang ikut tergabung (columnSpan)
  const hasStatusColumn = sheet.statusColumn !== null && sheet.statusColumn !== undefined;

  const rows = [
    [{ value: sheet.title, type: String, fontWeight: 'bold', fontSize: 14, textColor: COLORS.title, columnSpan: columnCount }, ...filler],
    [{ value: sheet.subtitle, type: String, textColor: COLORS.muted, columnSpan: columnCount }, ...filler],
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
      if (hasStatusColumn && columnIndex === sheet.statusColumn && STATUS_COLORS[String(value)]) {
        return toCell(value, { fontWeight: 'bold', textColor: STATUS_COLORS[String(value)] });
      }
      return toCell(value);
    }));
  });

  if (sheet.footer) {
    rows.push([]);
    rows.push([{ value: sheet.footer, type: String, fontWeight: 'bold', textColor: COLORS.title, columnSpan: columnCount }, ...filler]);
  }
  return rows;
}

export const downloadSheetsXlsx = async ({ sheets, fileNamePrefix }) => {
  const workbook = sheets.map((sheet) => ({
    data: buildSheetData(sheet),
    sheet: sheet.name,
    columns: computeColumns(sheet),
    stickyRowsCount: HEADER_ROW_COUNT,
    orientation: 'landscape',
  }));

  const blob = await writeXlsxFile(workbook).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
