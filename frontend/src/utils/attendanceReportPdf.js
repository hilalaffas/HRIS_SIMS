// File: src/utils/attendanceReportPdf.js
// [BARU] Render "sheet" laporan absensi (lihat
// pages/Laporan/utils/attendanceReportSheets.js) menjadi satu file PDF:
// SATU sheet = SATU halaman baru (karyawan baru selalu mulai di halaman baru).
// Di-import dinamis (lazy) dari tab Laporan Absen supaya jsPDF hanya diunduh
// browser saat user benar-benar klik "Unduh PDF".
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const HEADER_FILL = [241, 245, 249];
const TEXT_DARK = [30, 41, 59];
const TEXT_MUTED = [100, 116, 139];
const GRID_COLOR = [226, 232, 240];

// Warna teks kolom Status -- mengikuti tone badge di layar.
const STATUS_COLORS = {
  'HADIR TEPAT WAKTU': [5, 150, 105],
  TERLAMBAT: [180, 83, 9],
  SAKIT: [67, 56, 202],
  IZIN: [37, 99, 235],
  CUTI: [37, 99, 235],
  'MENUNGGU APPROVAL': [180, 83, 9],
  DITOLAK: [225, 29, 72],
  'TANPA KETERANGAN': [225, 29, 72],
  'BELUM ABSEN': [100, 116, 139],
};

const PAGE_MARGIN = 14;

export const downloadSheetsPdf = ({ sheets, fileNamePrefix }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const today = new Date();
  const printedAt = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  sheets.forEach((sheet, index) => {
    if (index > 0) doc.addPage();
    const isDaily = sheet.statusColumn !== null && sheet.statusColumn !== undefined;

    doc.setFontSize(14);
    doc.setTextColor(...TEXT_DARK);
    doc.text(sheet.title, PAGE_MARGIN, 15);
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`${sheet.subtitle} | Dicetak: ${printedAt}`, PAGE_MARGIN, 20);

    autoTable(doc, {
      head: [sheet.headers],
      body: sheet.rows.length
        ? sheet.rows.map((row) => row.map((cell) => String(cell ?? '-')))
        : [[{ content: 'Tidak ada data pada periode ini.', colSpan: sheet.headers.length, styles: { halign: 'center' } }]],
      startY: 24,
      theme: 'grid',
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 14 },
      // Sheet harian dibuat rapat supaya satu periode (<= 31 hari) muat 1 halaman.
      styles: {
        fontSize: isDaily ? 7 : 8.5,
        cellPadding: isDaily ? 1.1 : 2,
        textColor: TEXT_DARK,
        lineColor: GRID_COLOR,
        lineWidth: 0.2,
      },
      headStyles: { fillColor: HEADER_FILL, textColor: TEXT_MUTED, fontStyle: 'bold' },
      didParseCell: ({ section, column, cell }) => {
        if (!isDaily || section !== 'body' || column.index !== sheet.statusColumn) return;
        const color = STATUS_COLORS[String(cell.raw)];
        if (color) {
          cell.styles.textColor = color;
          cell.styles.fontStyle = 'bold';
        }
      },
    });

    if (sheet.footer) {
      const finalY = doc.lastAutoTable?.finalY ?? 24;
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXT_DARK);
      doc.text(sheet.footer, PAGE_MARGIN, finalY + 6);
    }
  });

  // Nomor halaman ditulis SETELAH semua halaman jadi (total halaman sudah pasti).
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Halaman ${page} dari ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 8, { align: 'right' });
  }

  doc.save(`${fileNamePrefix}_${today.toISOString().split('T')[0]}.pdf`);
};
