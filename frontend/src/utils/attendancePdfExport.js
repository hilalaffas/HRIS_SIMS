// File: src/utils/attendancePdfExport.js
// Render rekap absensi bulanan (lihat pages/Absensi/utils/monthlyAttendance.js)
// menjadi file PDF. Di-import dinamis (lazy) dari AttendanceHistoryTable.jsx
// supaya jsPDF hanya diunduh browser saat user benar-benar klik "Unduh PDF".
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const HEADER_FILL = [241, 245, 249];
const TEXT_DARK = [30, 41, 59];
const GRID_COLOR = [226, 232, 240];

// Warna teks kolom Status (indeks 5) mengikuti tone di layar.
const STATUS_COLORS = {
  'HADIR TEPAT WAKTU': [5, 150, 105],
  TERLAMBAT: [180, 83, 9],
  CUTI: [37, 99, 235],
  SAKIT: [67, 56, 202],
  'TANPA KETERANGAN': [225, 29, 72],
  'BELUM ABSEN': [100, 116, 139],
};
const STATUS_COLUMN_INDEX = 5;

export const downloadAttendancePdf = ({ title, periodLabel, fileNamePrefix, headers, rows }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = new Date();

  doc.setFontSize(14);
  doc.setTextColor(...TEXT_DARK);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Periode: ${periodLabel} | Dicetak: ${today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    14,
    20
  );

  autoTable(doc, {
    head: [headers],
    body: rows.length ? rows : [[{ content: 'Tidak ada data absensi pada periode ini.', colSpan: headers.length, styles: { halign: 'center' } }]],
    startY: 24,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK, lineColor: GRID_COLOR, lineWidth: 0.2 },
    headStyles: { fillColor: HEADER_FILL, textColor: [100, 116, 139], fontStyle: 'bold' },
    didParseCell: ({ section, column, cell }) => {
      if (section !== 'body' || column.index !== STATUS_COLUMN_INDEX) return;
      const color = STATUS_COLORS[String(cell.raw)];
      if (color) {
        cell.styles.textColor = color;
        cell.styles.fontStyle = 'bold';
      }
    },
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
