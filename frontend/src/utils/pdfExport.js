// File: src/utils/pdfExport.js
// Render data pivot cuti (lihat utils/leavePivot.js) menjadi file PDF.
// Modul ini di-import dinamis (lazy) dari Karyawan.jsx supaya library jsPDF
// hanya diunduh browser saat user benar-benar memilih ekspor PDF.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Warna mengikuti gaya PivotTable Excel (biru muda).
const HEADER_FILL = [219, 238, 244];
const FOOTER_FILL = [219, 238, 244];
const TEXT_DARK = [30, 41, 59];
const GRID_COLOR = [203, 213, 225];

const formatNumber = (value) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value);

// Sel angka: kosong kalau 0 (seperti PivotTable Excel), bukan menampilkan "0".
const formatPivotNumber = (value) => (value ? formatNumber(value) : '');

const formatDate = (value) => {
  if (!value) return '-';
  const [year, month, day] = String(value).split('T')[0].split('-');
  return year && month && day ? `${day}/${month}/${year}` : '-';
};

export const downloadPivotPdf = ({ title, fileNamePrefix, pivot }) => {
  const { statusColumns, groups, grandTotalByStatus, grandTotal } = pivot;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = new Date();

  doc.setFontSize(14);
  doc.setTextColor(...TEXT_DARK);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Dicetak: ${today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} | Nilai = jumlah durasi cuti (hari)`,
    14,
    20
  );

  const head = [[
    'Karyawan',
    'Tanggal Mulai',
    'Tanggal Selesai',
    'Jenis Cuti',
    'Sisa Cuti Setelah Pengajuan (Hari)',
    ...statusColumns.map((column) => column.label),
    'Grand Total',
  ]];

  // Nama karyawan digabung vertikal (rowSpan) di baris pertama tiap kelompok,
  // sama seperti tampilan "Row Labels" pada pivot.
  const body = groups.flatMap((group) =>
    group.rows.map((row, index) => {
      const cells = [];
      if (index === 0) {
        cells.push({
          content: group.name,
          rowSpan: group.rows.length,
          styles: { fontStyle: 'bold', valign: 'top' },
        });
      }
      cells.push(
        formatDate(row.startDate),
        formatDate(row.endDate),
        row.leaveType || '-',
        row.remainingLeave === null ? '-' : formatNumber(row.remainingLeave),
        ...statusColumns.map(({ key }) => (row.statusKey === key ? formatPivotNumber(row.totalDays) : '')),
        formatPivotNumber(row.totalDays)
      );
      return cells;
    })
  );

  const foot = [[
    { content: 'Grand Total', colSpan: 5 },
    ...statusColumns.map(({ key }) => formatPivotNumber(grandTotalByStatus[key])),
    formatPivotNumber(grandTotal),
  ]];

  const firstNumericColumn = 4; // "Sisa Cuti" dan kolom sesudahnya rata kanan
  const numericColumnStyles = Object.fromEntries(
    head[0].slice(firstNumericColumn).map((_, offset) => [firstNumericColumn + offset, { halign: 'right' }])
  );

  autoTable(doc, {
    head,
    body,
    foot,
    startY: 24,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK, lineColor: GRID_COLOR, lineWidth: 0.2 },
    headStyles: { fillColor: HEADER_FILL, textColor: TEXT_DARK, fontStyle: 'bold' },
    footStyles: { fillColor: FOOTER_FILL, textColor: TEXT_DARK, fontStyle: 'bold' },
    columnStyles: numericColumnStyles,
    // columnStyles hanya berlaku untuk isi tabel; header & footer angka disejajarkan manual.
    didParseCell: ({ section, column, cell }) => {
      if (section !== 'body' && column.index >= firstNumericColumn) cell.styles.halign = 'right';
    },
    showFoot: 'lastPage',
    // Nomor halaman di kanan bawah tiap halaman
    didDrawPage: () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Halaman ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  doc.save(`${fileNamePrefix}_${today.toISOString().split('T')[0]}.pdf`);
};
