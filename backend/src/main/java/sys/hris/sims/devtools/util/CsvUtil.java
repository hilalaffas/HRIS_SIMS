package sys.hris.sims.devtools.util;

import java.math.BigDecimal;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern; // [UBAH] dipakai ISO_DATE_PATTERN

// [BARU] Pembaca & penulis CSV untuk alat dev (/devAccess). Pemisah kolom otomatis
// terdeteksi dari baris header (';' bila lebih banyak dari ','), BOM UTF-8 dibuang,
// kolom boleh dibungkus tanda kutip. Penulisan selalu memakai ';' + BOM supaya
// langsung terbuka rapi di Excel (locale Indonesia).
public final class CsvUtil {

    private static final String BOM = "\uFEFF";
    private static final char WRITE_DELIMITER = ';';
    // [UBAH] Format tanggal import HANYA YYYY-MM-DD (dua digit bulan & hari). Formatter lama
    // d/M/uuuu dan d-M-uuuu dihapus karena membuat hari/bulan bisa tertukar tanpa ketahuan.
    private static final Pattern ISO_DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    private CsvUtil() {
    }

    // Satu baris data. number = nomor baris di file (baris header = 1).
    public record CsvRow(int number, Map<String, String> values) {
        // Nilai kolom (sudah di-trim); "" bila kolom kosong / tidak ada.
        public String get(String column) {
            String value = values.get(column);
            return value == null ? "" : value;
        }
    }

    public record CsvTable(List<String> headers, List<CsvRow> rows) {
    }

    // ============================== BACA ==============================

    public static CsvTable parse(String csvText) {
        if (csvText == null || csvText.isBlank()) {
            throw new IllegalArgumentException("File CSV kosong.");
        }
        String text = csvText.startsWith(BOM) ? csvText.substring(1) : csvText;
        char delimiter = detectDelimiter(text);
        List<List<String>> records = splitRecords(text, delimiter);

        if (records.isEmpty()) {
            throw new IllegalArgumentException("File CSV kosong.");
        }

        List<String> headers = new ArrayList<>();
        for (String header : records.get(0)) {
            headers.add(header.trim().toLowerCase().replaceAll("\\s+", "_"));
        }

        List<CsvRow> rows = new ArrayList<>();
        for (int i = 1; i < records.size(); i++) {
            List<String> cells = records.get(i);
            boolean allBlank = cells.stream().allMatch(cell -> cell.trim().isEmpty());
            if (allBlank) {
                continue;
            }
            Map<String, String> values = new LinkedHashMap<>();
            for (int c = 0; c < headers.size(); c++) {
                String cell = c < cells.size() ? cells.get(c).trim() : "";
                values.put(headers.get(c), cell);
            }
            rows.add(new CsvRow(i + 1, values));
        }
        return new CsvTable(headers, rows);
    }

    // [BARU] Baca CSV mentah sebagai grid (tanpa konsep header): dipakai format ledger cuti yang
    // berbentuk menyamping. Sel di-trim; baris kosong di akhir dibuang.
    public static List<List<String>> parseGrid(String csvText) {
        if (csvText == null || csvText.isBlank()) {
            throw new IllegalArgumentException("File CSV kosong.");
        }
        String text = csvText.startsWith(BOM) ? csvText.substring(1) : csvText;
        List<List<String>> records = splitRecords(text, detectDelimiter(text));
        List<List<String>> grid = new ArrayList<>();
        for (List<String> record : records) {
            List<String> trimmed = new ArrayList<>();
            for (String cell : record) {
                trimmed.add(cell.trim());
            }
            grid.add(trimmed);
        }
        while (!grid.isEmpty() && grid.get(grid.size() - 1).stream().allMatch(String::isEmpty)) {
            grid.remove(grid.size() - 1);
        }
        return grid;
    }

    private static char detectDelimiter(String text) {
        int end = text.indexOf('\n');
        String firstLine = end < 0 ? text : text.substring(0, end);
        long semicolons = firstLine.chars().filter(ch -> ch == ';').count();
        long commas = firstLine.chars().filter(ch -> ch == ',').count();
        return semicolons >= commas && semicolons > 0 ? ';' : ',';
    }

    private static List<List<String>> splitRecords(String text, char delimiter) {
        List<List<String>> records = new ArrayList<>();
        List<String> current = new ArrayList<>();
        StringBuilder cell = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (inQuotes) {
                if (ch == '"') {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        cell.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    cell.append(ch);
                }
            } else if (ch == '"') {
                inQuotes = true;
            } else if (ch == delimiter) {
                current.add(cell.toString());
                cell.setLength(0);
            } else if (ch == '\r') {
                // diabaikan; baris diakhiri oleh '\n'
            } else if (ch == '\n') {
                current.add(cell.toString());
                cell.setLength(0);
                records.add(current);
                current = new ArrayList<>();
            } else {
                cell.append(ch);
            }
        }

        if (inQuotes) {
            throw new IllegalArgumentException("File CSV rusak: ada tanda kutip (\") yang tidak ditutup.");
        }
        if (cell.length() > 0 || !current.isEmpty()) {
            current.add(cell.toString());
            records.add(current);
        }
        return records;
    }

    // [UBAH] Tanggal: HANYA YYYY-MM-DD (contoh 2024-01-31), tanpa terkecuali. Format d/M/yyyy,
    // M/d/yyyy, yyyy/MM/dd, atau 1 digit (2024-1-5) ditolak supaya hari & bulan tidak pernah
    // tertukar saat file dibaca. Tanggal yang tidak ada di kalender (2024-02-30) ikut ditolak.
    public static LocalDate parseDate(String value, String columnLabel) {
        String text = value == null ? "" : value.trim();
        if (ISO_DATE_PATTERN.matcher(text).matches()) {
            try {
                return LocalDate.parse(text); // ISO_LOCAL_DATE bersifat STRICT
            } catch (DateTimeException ex) {
                // jatuh ke pesan error di bawah
            }
        }
        throw new IllegalArgumentException(
                columnLabel + " '" + text + "' tidak valid. Gunakan format YYYY-MM-DD (contoh 2024-01-31).");
    }

    // Angka desimal: "2.25" atau "2,25" (Excel locale Indonesia). Maksimal 2 angka di belakang koma.
    public static BigDecimal parseDecimal(String value, String columnLabel) {
        String text = value == null ? "" : value.trim();
        boolean hasDot = text.contains(".");
        boolean hasComma = text.contains(",");
        if (hasDot && hasComma) {
            throw new IllegalArgumentException(columnLabel + " '" + text + "' tidak valid. Pakai satu pemisah desimal saja.");
        }
        String normalized = text.replace(',', '.');
        if (!normalized.matches("-?\\d+(\\.\\d{1,2})?")) {
            throw new IllegalArgumentException(
                    columnLabel + " '" + text + "' tidak valid. Isi angka, maksimal 2 angka di belakang koma (contoh 7.5).");
        }
        return new BigDecimal(normalized);
    }

    // ============================== TULIS ==============================

    public static String write(List<String> headers, List<List<String>> rows) {
        StringBuilder out = new StringBuilder(BOM);
        out.append(joinRow(headers)).append("\r\n");
        for (List<String> row : rows) {
            out.append(joinRow(row)).append("\r\n");
        }
        return out.toString();
    }

    // [BARU] Tulis baris apa adanya (tanpa baris header khusus) dengan pemisah pilihan + BOM UTF-8.
    // Dipakai export ledger cuti yang memakai koma seperti file contoh.
    public static String writeRows(List<List<String>> rows, char delimiter) {
        StringBuilder out = new StringBuilder(BOM);
        for (List<String> row : rows) {
            out.append(joinRow(row, delimiter)).append("\r\n");
        }
        return out.toString();
    }

    private static String joinRow(List<String> cells) {
        return joinRow(cells, WRITE_DELIMITER);
    }

    private static String joinRow(List<String> cells, char delimiter) {
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < cells.size(); i++) {
            if (i > 0) {
                line.append(delimiter);
            }
            line.append(escape(cells.get(i), delimiter));
        }
        return line.toString();
    }

    private static String escape(String value, char delimiter) {
        String text = value == null ? "" : value;
        boolean needsQuote = text.indexOf(delimiter) >= 0 || text.indexOf('"') >= 0
                || text.indexOf('\n') >= 0 || text.indexOf('\r') >= 0;
        return needsQuote ? "\"" + text.replace("\"", "\"\"") + "\"" : text;
    }

    // Cegah "CSV injection": teks yang diawali = + @ (atau - bukan angka) bisa dibaca Excel sebagai
    // rumus. Dipakai untuk kolom teks bebas; JANGAN dipakai untuk kolom nomor telepon / angka.
    public static String safeText(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        char first = value.charAt(0);
        boolean risky = first == '=' || first == '+' || first == '@' || first == '\t'
                || (first == '-' && !value.matches("-\\d.*"));
        return risky ? "'" + value : value;
    }
}
