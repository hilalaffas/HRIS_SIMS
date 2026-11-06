package sys.hris.sims.devtools.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// [BARU] Format "ledger cuti" (インドネシア有給管理台帳) untuk import / export riwayat cuti.
//
// Bentuk file (menyamping, tiap karyawan menempati 2 kolom bersebelahan mulai kolom B):
//
//   baris 1 : 項番 | <nomor NIK> |        | <nomor NIK> |       ...
//   baris 2 : 氏名/残日数 | <nama> | <sisa cuti> | <nama> | <sisa cuti> ...
//   baris 3+: 使用日/事由 | <jumlah hari> | <tanggal> | ...   (satu baris = satu tanggal)
//   baris terakhir (opsional): total pemakaian per karyawan (tanpa tanggal) -> diabaikan saat import
//
// [UBAH] Aturan baca terbaru:
//   - Tanggal HANYA format YYYY-MM-DD (contoh 2026-11-26). Format lain (yyyy/mm/dd, d/m/yyyy,
//     m/d/yyyy) ditolak -- tidak ada lagi tebak-tebakan hari/bulan dari tanggal tetangga.
//   - Jumlah hari per baris (satu baris = satu tanggal):
//       0.5 = setengah hari, 1 = cuti yang memotong jatah (cuti tahunan dll.),
//       0   = cuti khusus yang TIDAK memotong jatah (wajib komentar berisi tipe cuti),
//       > 1 = HANYA untuk cuti hangus/expired (komentar "hangus/expired"). Cuti hangus juga
//             boleh bernilai 0.5 atau 1; nilainya ditentukan dari komentar sel itu.
//     Cuti beberapa hari ditulis satu baris per hari (tidak ada lagi baris "3 hari").
//   - Komentar sel (hanya ada di file .xlsx, lihat LeaveLedgerXlsx) menentukan TIPE CUTI.
//     Komentar boleh di sel jumlah hari ATAU sel tanggal pada baris yang sama.
//
// Kelas ini murni Java (tanpa Spring) supaya parser & penulisnya mudah diuji sendiri.
public final class LeaveLedgerCsv {

    public static final String LABEL_ITEM_NO = "項番";
    public static final String LABEL_NAME = "氏名/残日数";
    public static final String LABEL_USAGE = "使用日/事由";

    private static final char DELIMITER = ',';
    private static final int MIN_VALID_YEAR = 2000;
    // [UBAH] Format tanggal export = YYYY-MM-DD (sama dengan satu-satunya format yang diterima import).
    private static final DateTimeFormatter EXPORT_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    // [BARU] Komentar sel yang dipakai export untuk baris cuti hangus, dan kata kunci yang dikenali import.
    public static final String FORFEIT_COMMENT = "hangus/expired";
    private static final Pattern FORFEIT_PATTERN =
            Pattern.compile("(?i)hangus|expire|kedaluwarsa|kadaluarsa");
    // [BARU] Batas wajar cuti hangus dalam satu baris (periode tahunan, kelipatan 0.5).
    public static final BigDecimal MAX_FORFEIT_DAYS = new BigDecimal("366");
    private static final BigDecimal HALF_DAY = new BigDecimal("0.5");

    private LeaveLedgerCsv() {
    }

    // ============================== MODEL ==============================

    // Satu sel tanggal di file: csvRow = nomor baris (1 = baris pertama), csvColumn = indeks kolom (0 = A).
    // [UBAH] + daysComment / dateComment: komentar sel Excel pada sel jumlah hari / sel tanggal
    // (null bila tidak ada; selalu null untuk file CSV).
    public record Entry(int csvRow, int csvColumn, String daysText, String dateText,
                        String daysComment, String dateComment) {

        // Komentar yang berlaku untuk baris ini; null bila tidak ada.
        public String comment() {
            if (daysComment != null && !daysComment.isBlank()) {
                return daysComment;
            }
            return dateComment == null || dateComment.isBlank() ? null : dateComment;
        }

        // Komentar di sel jumlah hari dan sel tanggal berbeda isinya -> tidak jelas mana yang dipakai.
        public boolean hasConflictingComments() {
            return daysComment != null && !daysComment.isBlank()
                    && dateComment != null && !dateComment.isBlank()
                    && !daysComment.equalsIgnoreCase(dateComment);
        }
    }

    // Satu karyawan (sepasang kolom).
    public record Block(int column, String nikText, Integer nikNumber, String name,
                        String remainingText, List<Entry> entries) {
    }

    public record Ledger(List<Block> blocks) {
    }

    public enum EntryStatus { OK, ZERO, INVALID }

    // [BARU] Sumber komentar sel (dipakai LeaveLedgerXlsx). Nomor baris & kolom berbasis 0.
    @FunctionalInterface
    public interface CommentLookup {
        String commentAt(int row, int column);

        static CommentLookup none() {
            return (row, column) -> null;
        }
    }

    // Hasil membaca satu Entry: OK (days & date terisi), ZERO (0 hari, diabaikan), INVALID (message berisi alasan).
    public record ResolvedEntry(Entry entry, EntryStatus status, BigDecimal days, LocalDate date, String message) {
    }

    // Data untuk export. [UBAH] + comment: tipe cuti yang ditulis sebagai KOMENTAR SEL pada export
    // Excel (null untuk cuti tahunan & setengah hari, yang tidak perlu komentar).
    public record DayUsage(LocalDate date, BigDecimal days, String comment, boolean forfeited) {
        public DayUsage(LocalDate date, BigDecimal days) {
            this(date, days, null, false);
        }

        public DayUsage(LocalDate date, BigDecimal days, String comment) {
            this(date, days, comment, false);
        }
    }

    // [BARU] Isi sheet export: rows = sel teks (baris 0 = baris 1 Excel), comments = komentar sel
    // dengan kunci (baris * 100000 + kolom), baris & kolom berbasis 0.
    public record ExportGrid(List<List<String>> rows, java.util.Map<Long, String> comments) {
    }

    public record ExportEmployee(Integer nikNumber, String name, BigDecimal remaining, List<DayUsage> usages) {
    }

    // ============================== BACA ==============================

    public static Ledger parse(String csvText) {
        return fromGrid(CsvUtil.parseGrid(csvText), CommentLookup.none());
    }

    // [BARU] Bangun Ledger dari grid sel (CSV atau hasil baca .xlsx). Satu tempat untuk semua
    // aturan bentuk file supaya CSV dan Excel selalu dibaca dengan cara yang sama.
    public static Ledger fromGrid(List<List<String>> grid, CommentLookup comments) {
        if (grid.size() < 3
                || !cell(grid, 0, 0).contains(LABEL_ITEM_NO)
                || !cell(grid, 1, 0).contains("氏名")) {
            throw new IllegalArgumentException("Format file tidak sesuai ledger cuti: sel A1 harus berisi \""
                    + LABEL_ITEM_NO + "\" dan sel A2 harus berisi \"" + LABEL_NAME + "\".");
        }

        int width = grid.stream().mapToInt(List::size).max().orElse(0);

        // Baris tanpa satu pun tanggal (baris total di bawah) dilewati seluruhnya.
        List<Integer> dataRows = new ArrayList<>();
        for (int row = 2; row < grid.size(); row++) {
            boolean hasDate = false;
            for (int column = 2; column < width; column += 2) {
                if (!cell(grid, row, column).isEmpty()) {
                    hasDate = true;
                    break;
                }
            }
            if (hasDate) {
                dataRows.add(row);
            }
        }

        List<Block> blocks = new ArrayList<>();
        for (int column = 1; column < width; column += 2) {
            String nikText = cell(grid, 0, column);
            String name = cell(grid, 1, column);
            String remainingText = cell(grid, 1, column + 1);

            List<Entry> entries = new ArrayList<>();
            for (int row : dataRows) {
                String daysText = cell(grid, row, column);
                String dateText = cell(grid, row, column + 1);
                if (!daysText.isEmpty() || !dateText.isEmpty()) {
                    entries.add(new Entry(row + 1, column, daysText, dateText,
                            comments.commentAt(row, column), comments.commentAt(row, column + 1)));
                }
            }

            if (nikText.isEmpty() && name.isEmpty() && entries.isEmpty()) {
                continue; // pasangan kolom kosong
            }
            blocks.add(new Block(column, nikText, parseNikNumber(nikText), name, remainingText, entries));
        }
        return new Ledger(blocks);
    }

    private static String cell(List<List<String>> grid, int row, int column) {
        if (row >= grid.size()) {
            return "";
        }
        List<String> line = grid.get(row);
        return column < line.size() ? line.get(column) : "";
    }

    // [BARU] Komentar menandai cuti hangus bila memuat "hangus" / "expired" (huruf besar-kecil bebas).
    public static boolean isForfeitComment(String comment) {
        return comment != null && FORFEIT_PATTERN.matcher(comment).find();
    }

    // "4" / "04" / "171" -> angka. Selain angka -> null.
    static Integer parseNikNumber(String text) {
        if (text == null || !text.trim().matches("\\d{1,6}")) {
            return null;
        }
        return Integer.valueOf(text.trim());
    }

    // [UBAH] Angka NIK: 0004 -> 4 (format lama SYS-2024-0004 juga tetap terbaca). Format lain -> null.
    public static Integer nikNumberOf(String nik) {
        if (nik == null) {
            return null;
        }
        Matcher matcher = Pattern.compile("(\\d+)\\s*$").matcher(nik.trim());
        return matcher.find() ? Integer.valueOf(matcher.group(1)) : null;
    }

    // Sisa cuti: "39.5", "42.0 ", "(2.0)" (= -2.0, gaya akuntansi), "-2". Kosong -> null.
    public static BigDecimal parseRemaining(String text) {
        String value = text == null ? "" : text.trim();
        if (value.isEmpty()) {
            return null;
        }
        boolean negative = false;
        if (value.startsWith("(") && value.endsWith(")")) {
            negative = true;
            value = value.substring(1, value.length() - 1).trim();
        }
        BigDecimal number = CsvUtil.parseDecimal(value, "Sisa cuti");
        return negative ? number.negate() : number;
    }

    // ---------------------------------------------------------------
    // Membaca semua baris tanggal satu karyawan.
    //
    // [UBAH] Tanggal HANYA YYYY-MM-DD. Tidak ada lagi penebakan hari/bulan dari tanggal tetangga:
    // yang tidak sesuai format ditandai INVALID agar diperbaiki di sumber file.
    //
    // Aturan jumlah hari (tipe cuti diputuskan DevLeaveHistoryService dari komentar sel):
    //   komentar hangus/expired -> cuti hangus: 0.5 / 1 / kelipatan 0.5 sampai MAX_FORFEIT_DAYS
    //   0.5                     -> setengah hari (komentar diabaikan)
    //   1                       -> cuti tahunan; bila ada komentar, tipenya mengikuti komentar
    //                              (tipe yang tidak memotong jatah ditolak: harus 0)
    //   0                       -> cuti khusus tidak memotong jatah; WAJIB ada komentar. Tanpa
    //                              komentar baris diabaikan (status ZERO)
    //   lainnya (> 1 tanpa komentar hangus, pecahan lain) -> INVALID
    // ---------------------------------------------------------------
    public static List<ResolvedEntry> resolveEntries(Block block, LocalDate today) {
        List<ResolvedEntry> result = new ArrayList<>();
        for (Entry entry : block.entries()) {
            result.add(resolveEntry(entry, today));
        }
        return result;
    }

    private static ResolvedEntry resolveEntry(Entry entry, LocalDate today) {
        String where = "Kolom " + columnLetter(entry.csvColumn() + 1) + " baris " + entry.csvRow() + ": ";
        String comment = entry.comment();

        if (entry.hasConflictingComments()) {
            return invalid(entry, where + "komentar di sel jumlah hari ('" + entry.daysComment()
                    + "') berbeda dengan komentar di sel tanggal ('" + entry.dateComment()
                    + "'). Pakai satu komentar saja.");
        }

        // ---- jumlah hari ----
        if (entry.daysText().isEmpty()) {
            return invalid(entry, where + "jumlah hari kosong.");
        }
        BigDecimal days;
        try {
            days = CsvUtil.parseDecimal(entry.daysText(), "Jumlah hari");
        } catch (IllegalArgumentException ex) {
            return invalid(entry, where + ex.getMessage());
        }
        if (days.signum() < 0) {
            return invalid(entry, where + "jumlah hari tidak boleh negatif (ditemukan " + entry.daysText() + ").");
        }

        boolean forfeit = isForfeitComment(comment);
        if (forfeit) {
            boolean isMultipleOfHalf = days.multiply(BigDecimal.valueOf(2)).stripTrailingZeros().scale() <= 0;
            if (days.signum() == 0 || !isMultipleOfHalf || days.compareTo(MAX_FORFEIT_DAYS) > 0) {
                return invalid(entry, where + "cuti hangus/expired harus lebih dari 0, kelipatan 0.5, dan maksimal "
                        + MAX_FORFEIT_DAYS.toPlainString() + " hari (ditemukan " + entry.daysText() + ").");
            }
        } else {
            if (days.signum() == 0 && comment == null) {
                return new ResolvedEntry(entry, EntryStatus.ZERO, BigDecimal.ZERO, null, "");
            }
            boolean isValidAmount = days.signum() == 0
                    || days.compareTo(HALF_DAY) == 0
                    || days.compareTo(BigDecimal.ONE) == 0;
            if (!isValidAmount) {
                String reason = days.compareTo(BigDecimal.ONE) > 0
                        ? "nilai lebih dari 1 hanya untuk cuti hangus/expired (beri komentar \"" + FORFEIT_COMMENT
                                + "\"). Cuti beberapa hari ditulis satu baris per hari."
                        : "jumlah hari harus 0, 0.5, atau 1";
                return invalid(entry, where + reason + " (ditemukan " + entry.daysText() + ").");
            }
        }

        // ---- tanggal (hanya YYYY-MM-DD) ----
        if (entry.dateText().isEmpty()) {
            return invalid(entry, where + "tanggal kosong (jumlah " + entry.daysText() + " hari tidak punya tanggal).");
        }
        LocalDate date;
        try {
            date = CsvUtil.parseDate(entry.dateText(), "Tanggal");
        } catch (IllegalArgumentException ex) {
            return invalid(entry, where + ex.getMessage());
        }
        if (date.getYear() < MIN_VALID_YEAR || date.isAfter(today.plusYears(1))) {
            return invalid(entry, where + "tahun pada tanggal '" + entry.dateText()
                    + "' tidak wajar (periksa salah ketik).");
        }
        return new ResolvedEntry(entry, EntryStatus.OK, days, date, "");
    }

    private static ResolvedEntry invalid(Entry entry, String message) {
        return new ResolvedEntry(entry, EntryStatus.INVALID, null, null, message);
    }

    // 0 -> A, 1 -> B, 26 -> AA (nomor kolom Excel mulai dari 1)
    public static String columnLetter(int columnNumber) {
        StringBuilder letters = new StringBuilder();
        int number = columnNumber;
        while (number > 0) {
            int remainder = (number - 1) % 26;
            letters.insert(0, (char) ('A' + remainder));
            number = (number - 1) / 26;
        }
        return letters.toString();
    }

    // ============================== TULIS ==============================

    // [UBAH] Tanggal export selalu YYYY-MM-DD supaya file hasil export bisa langsung di-import lagi.
    public static String write(List<ExportEmployee> employees) {
        return CsvUtil.writeRows(toGrid(employees).rows(), DELIMITER);
    }

    // [BARU] Susunan sel export (dipakai export CSV dan Excel). Komentar tipe cuti ditempel di sel
    // jumlah hari; CSV tidak bisa menyimpannya sehingga hanya export Excel yang memakai `comments`.
    public static ExportGrid toGrid(List<ExportEmployee> employees) {
        int maxUsages = employees.stream().mapToInt(employee -> employee.usages().size()).max().orElse(0);
        int dataRows = Math.max(maxUsages, 1);

        List<List<String>> rows = new ArrayList<>();
        java.util.Map<Long, String> comments = new java.util.HashMap<>();

        List<String> itemRow = new ArrayList<>();
        itemRow.add(LABEL_ITEM_NO);
        List<String> nameRow = new ArrayList<>();
        nameRow.add(LABEL_NAME);
        for (ExportEmployee employee : employees) {
            itemRow.add(employee.nikNumber() == null ? "" : String.format("%04d", employee.nikNumber()));
            itemRow.add("");
            nameRow.add(CsvUtil.safeText(employee.name()));
            nameRow.add(formatRemaining(employee.remaining()));
        }
        rows.add(itemRow);
        rows.add(nameRow);

        for (int index = 0; index < dataRows; index++) {
            List<String> row = new ArrayList<>();
            row.add(index == 0 ? LABEL_USAGE : "");
            int rowIndex = rows.size();
            for (int employeeIndex = 0; employeeIndex < employees.size(); employeeIndex++) {
                ExportEmployee employee = employees.get(employeeIndex);
                if (index < employee.usages().size()) {
                    DayUsage usage = employee.usages().get(index);
                    row.add(formatDays(usage.days()));
                    row.add(EXPORT_DATE.format(usage.date()));
                    if (usage.comment() != null && !usage.comment().isBlank()) {
                        comments.put(rowIndex * 100_000L + (1 + 2 * employeeIndex), usage.comment());
                    }
                } else {
                    row.add("");
                    row.add("");
                }
            }
            rows.add(row);
        }

        List<String> totalRow = new ArrayList<>();
        totalRow.add("");
        for (ExportEmployee employee : employees) {
            // [UBAH] Cuti hangus bukan pemakaian -- tidak ikut baris total.
            BigDecimal total = employee.usages().stream()
                    .filter(usage -> !usage.forfeited())
                    .map(DayUsage::days)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totalRow.add(employee.usages().stream().noneMatch(usage -> !usage.forfeited()) ? "" : formatDays(total));
            totalRow.add("");
        }
        rows.add(totalRow);

        return new ExportGrid(rows, comments);
    }

    // 1 -> "1", 0.5 -> "0.5", 114.00 -> "114"
    static String formatDays(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return (stripped.scale() < 0 ? stripped.setScale(0) : stripped).toPlainString();
    }

    // Sisa cuti minimal 1 desimal ("42.0"), negatif gaya akuntansi "(2.0)" seperti file contoh.
    static String formatRemaining(BigDecimal value) {
        if (value == null) {
            return "";
        }
        BigDecimal absolute = value.abs().stripTrailingZeros();
        int scale = Math.min(2, Math.max(1, absolute.scale()));
        String text = value.abs().setScale(scale, RoundingMode.HALF_UP).toPlainString();
        return value.signum() < 0 ? "(" + text + ")" : text;
    }
}
