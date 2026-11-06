package sys.hris.sims.devtools.util;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.Comment;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Drawing;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.SheetVisibility;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import sys.hris.sims.devtools.util.LeaveLedgerCsv.CommentLookup;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.ExportEmployee;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.ExportGrid;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.Ledger;

// [BARU] Pembaca file Excel (.xlsx) untuk import riwayat cuti. Bentuk sheet SAMA PERSIS dengan
// ledger CSV (lihat LeaveLedgerCsv) -- tidak ada kolom/baris tambahan. Bedanya, KOMENTAR SEL
// ikut dibaca dan dipakai sebagai tipe cuti baris tersebut.
//
// Keamanan:
//   - Hanya .xlsx (bukan .xlsm / .xls). Pemeriksaan ukuran, ekstensi, dan tanda "PK" ada di controller.
//   - Rumus TIDAK dihitung ulang: hanya nilai hasil terakhir yang tersimpan di file yang dibaca.
//   - Batas jumlah baris/kolom dan batas ukuran isi zip (anti zip-bomb).
//   - Teks komentar hanya dipakai untuk MENCOCOKKAN nama tipe cuti yang sudah ada di database;
//     tidak pernah disimpan atau dieksekusi.
//   - Pesan error ke pengguna tidak membocorkan isi stack trace.
//
// Sel tanggal: sel bertipe tanggal Excel dibaca langsung (tidak bergantung locale/format tampilan,
// jadi hari & bulan tidak mungkin tertukar) lalu diubah ke YYYY-MM-DD. Sel teks harus persis
// YYYY-MM-DD -- aturan itu diperiksa di LeaveLedgerCsv.resolveEntries.
public final class LeaveLedgerXlsx {

    private static final String PREFERRED_SHEET = "使用・残日数";
    private static final int MAX_ROWS = 3000;
    private static final int MAX_COLUMNS = 1000;
    private static final int MAX_COMMENT_LENGTH = 100;
    private static final long MAX_ZIP_ENTRY_BYTES = 64L * 1024 * 1024;

    // Komentar "threaded" (Excel 365) disimpan sebagai catatan lama berisi teks pembuka bawaan.
    private static final String THREADED_MARKER = "[Threaded comment]";
    private static final String THREADED_COMMENT_LABEL = "\nComment:";
    private static final String THREADED_REPLY_LABEL = "\nReply:";

    static {
        // Perketat batas bawaan POI terhadap file zip yang "mengembang" saat dibuka.
        ZipSecureFile.setMinInflateRatio(0.01d);
        ZipSecureFile.setMaxEntrySize(MAX_ZIP_ENTRY_BYTES);
    }

    private LeaveLedgerXlsx() {
    }

    public static Ledger parse(byte[] content) {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            Sheet sheet = pickSheet(workbook);
            List<List<String>> grid = readGrid(sheet);
            Map<Long, String> comments = readComments(sheet);
            CommentLookup lookup = (row, column) -> comments.get(key(row, column));
            return LeaveLedgerCsv.fromGrid(grid, lookup);
        } catch (IOException | RuntimeException ex) {
            if (ex instanceof IllegalArgumentException) {
                throw (IllegalArgumentException) ex; // pesan dari kita sendiri (mis. batas baris)
            }
            throw new IllegalArgumentException(
                    "File Excel tidak dapat dibaca. Pastikan file .xlsx asli (bukan .xlsm/.xls), tidak diberi password, dan tidak rusak.");
        }
    }

    // [BARU] Export ke .xlsx dengan bentuk sheet yang sama seperti file import. Tipe cuti selain
    // cuti tahunan & setengah hari ditulis sebagai KOMENTAR di sel jumlah hari, sehingga file hasil
    // export bisa langsung di-import lagi. Tanggal ditulis sebagai TEKS YYYY-MM-DD; isi teks tidak
    // pernah menjadi rumus (setCellValue(String) menyimpannya sebagai string biasa).
    public static byte[] write(List<ExportEmployee> employees) {
        ExportGrid grid = LeaveLedgerCsv.toGrid(employees);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(PREFERRED_SHEET);
            CreationHelper helper = workbook.getCreationHelper();
            Drawing<?> drawing = sheet.createDrawingPatriarch();

            List<List<String>> rows = grid.rows();
            for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
                Row row = sheet.createRow(rowIndex);
                List<String> line = rows.get(rowIndex);
                for (int columnIndex = 0; columnIndex < line.size(); columnIndex++) {
                    String value = line.get(columnIndex);
                    if (value.isEmpty()) {
                        continue;
                    }
                    Cell cell = row.createCell(columnIndex);
                    // Jumlah hari (baris data, kolom ganjil) ditulis sebagai angka; selain itu teks.
                    boolean isDaysCell = rowIndex >= 2 && columnIndex % 2 == 1 && value.matches("\\d+(\\.\\d+)?");
                    if (isDaysCell) {
                        cell.setCellValue(new BigDecimal(value).doubleValue());
                    } else {
                        cell.setCellValue(value);
                    }
                    String comment = grid.comments().get(key(rowIndex, columnIndex));
                    if (comment != null) {
                        ClientAnchor anchor = helper.createClientAnchor();
                        anchor.setCol1(columnIndex + 1);
                        anchor.setCol2(columnIndex + 3);
                        anchor.setRow1(rowIndex);
                        anchor.setRow2(rowIndex + 2);
                        Comment cellComment = drawing.createCellComment(anchor);
                        cellComment.setString(helper.createRichTextString(comment));
                        cellComment.setAuthor("SIMS");
                        cell.setCellComment(cellComment);
                    }
                }
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Gagal membuat file Excel.", ex);
        }
    }

    // Sheet bernama 使用・残日数 bila ada; kalau tidak, sheet terlihat pertama.
    private static Sheet pickSheet(Workbook workbook) {
        Sheet preferred = workbook.getSheet(PREFERRED_SHEET);
        if (preferred != null) {
            return preferred;
        }
        for (int index = 0; index < workbook.getNumberOfSheets(); index++) {
            if (workbook.getSheetVisibility(index) == SheetVisibility.VISIBLE) {
                return workbook.getSheetAt(index);
            }
        }
        throw new IllegalArgumentException("File Excel tidak punya sheet yang terlihat.");
    }

    private static List<List<String>> readGrid(Sheet sheet) {
        int lastRow = sheet.getLastRowNum();
        if (lastRow + 1 > MAX_ROWS) {
            throw new IllegalArgumentException("Sheet terlalu besar (maksimal " + MAX_ROWS + " baris).");
        }
        List<List<String>> grid = new ArrayList<>();
        for (int rowIndex = 0; rowIndex <= lastRow; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            List<String> line = new ArrayList<>();
            if (row != null) {
                int cellCount = Math.max(row.getLastCellNum(), 0);
                if (cellCount > MAX_COLUMNS) {
                    throw new IllegalArgumentException("Sheet terlalu lebar (maksimal " + MAX_COLUMNS + " kolom).");
                }
                for (int columnIndex = 0; columnIndex < cellCount; columnIndex++) {
                    line.add(cellText(row.getCell(columnIndex)));
                }
            }
            grid.add(line);
        }
        return grid;
    }

    // Isi sel sebagai teks. Tanggal -> YYYY-MM-DD; angka -> tanpa nol desimal berlebih ("1", "0.5").
    static String cellText(Cell cell) {
        if (cell == null) {
            return "";
        }
        CellType type = cell.getCellType() == CellType.FORMULA
                ? cell.getCachedFormulaResultType()
                : cell.getCellType();
        switch (type) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().toLocalDate().toString();
                }
                double number = cell.getNumericCellValue();
                if (Double.isNaN(number) || Double.isInfinite(number)) {
                    return "";
                }
                return BigDecimal.valueOf(number).stripTrailingZeros().toPlainString();
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return ""; // BLANK, ERROR
        }
    }

    private static Map<Long, String> readComments(Sheet sheet) {
        Map<Long, String> result = new HashMap<>();
        Map<CellAddress, ? extends Comment> raw = sheet.getCellComments();
        if (raw == null) {
            return result;
        }
        for (Map.Entry<CellAddress, ? extends Comment> entry : raw.entrySet()) {
            Comment comment = entry.getValue();
            String text = comment.getString() == null ? null : comment.getString().getString();
            String cleaned = cleanComment(text, comment.getAuthor());
            if (cleaned != null) {
                result.put(key(entry.getKey().getRow(), entry.getKey().getColumn()), cleaned);
            }
        }
        return result;
    }

    private static long key(int row, int column) {
        return (long) row * 100_000L + column;
    }

    // Membersihkan teks komentar: buang nama penulis ("Nama:") dan pembuka komentar threaded,
    // gabungkan baris, batasi panjang. Kembali null bila hasilnya kosong.
    static String cleanComment(String raw, String author) {
        if (raw == null) {
            return null;
        }
        String text = raw.replace("\r\n", "\n").replace('\r', '\n').trim();

        if (text.startsWith(THREADED_MARKER)) {
            int start = text.indexOf(THREADED_COMMENT_LABEL);
            if (start < 0) {
                return null;
            }
            text = text.substring(start + THREADED_COMMENT_LABEL.length());
            int reply = text.indexOf(THREADED_REPLY_LABEL);
            if (reply >= 0) {
                text = text.substring(0, reply); // hanya komentar pertama, balasan diabaikan
            }
        } else if (author != null && !author.isBlank() && text.startsWith(author.trim() + ":")) {
            text = text.substring(author.trim().length() + 1);
        }

        text = text.replaceAll("\\s+", " ").trim();
        if (text.isEmpty()) {
            return null;
        }
        return text.length() > MAX_COMMENT_LENGTH ? text.substring(0, MAX_COMMENT_LENGTH) : text;
    }
}
