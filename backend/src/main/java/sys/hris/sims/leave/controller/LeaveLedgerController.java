package sys.hris.sims.leave.controller;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.devtools.service.DevLeaveHistoryService;
import sys.hris.sims.devtools.util.LeaveLedgerCsv.ExportEmployee;
import sys.hris.sims.devtools.util.LeaveLedgerXlsx;
import sys.hris.sims.leave.dto.LeaveLedgerResponse;
import sys.hris.sims.user.entity.User;
import sys.hris.sims.user.repository.UserRepository;

// [BARU] Tab "Histori Cuti" di halaman Karyawan untuk HR Admin & Super Admin: tampilan tabel dan
// export Excel format ledger. Datanya SAMA dengan export di panel /devAccess (DevLeaveHistoryService):
// cuti khusus bernilai 0 dengan tipe di komentar sel, dan sisa cuti kedaluwarsa tercatat "hangus/expired".
// Dibatasi ADMIN_ROLES di SecurityConfig. Hanya membaca data -- tidak ada yang diubah.
//
// Parameter periode (yyyy-MM-dd) boleh diisi salah satu: hanya "from" = sampai paling akhir,
// hanya "to" = dari paling awal. Kosong semua = seluruh riwayat.
@RestController
@RequestMapping("/api/cuti/ledger")
@RequiredArgsConstructor
public class LeaveLedgerController {

    private static final LocalDate EARLIEST = LocalDate.of(1900, 1, 1);
    private static final LocalDate LATEST = LocalDate.of(2999, 12, 31);
    private static final MediaType XLSX = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final DevLeaveHistoryService leaveHistoryService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<LeaveLedgerResponse> getLedger(@RequestParam(required = false) String from,
                                                         @RequestParam(required = false) String to,
                                                         Authentication authentication,
                                                         HttpServletRequest httpRequest) {
        LocalDate[] period = resolvePeriod(from, to);
        List<ExportEmployee> rows = leaveHistoryService.exportRows(period[0], period[1]);

        List<LeaveLedgerResponse.Employee> employees = rows.stream()
                .map(row -> new LeaveLedgerResponse.Employee(
                        row.nikNumber(),
                        nikText(row),
                        row.name(),
                        row.remaining(),
                        row.usages().stream()
                                .map(usage -> new LeaveLedgerResponse.Usage(
                                        usage.date(), usage.days(), usage.comment(), usage.forfeited()))
                                .toList()))
                .toList();

        log(authentication, httpRequest, "GET_HISTORI_CUTI", "Melihat histori cuti (format ledger)" + periodText(from, to));
        return ResponseEntity.ok(new LeaveLedgerResponse(from == null || from.isBlank() ? null : period[0],
                to == null || to.isBlank() ? null : period[1], employees));
    }

    // Export Excel. Parameter q (opsional) = pencarian nama/NIK yang sama dengan kolom cari di tabel,
    // supaya file berisi persis karyawan yang sedang ditampilkan.
    @GetMapping("/export-xlsx")
    public ResponseEntity<byte[]> exportXlsx(@RequestParam(required = false) String from,
                                             @RequestParam(required = false) String to,
                                             @RequestParam(required = false) String q,
                                             Authentication authentication,
                                             HttpServletRequest httpRequest) {
        LocalDate[] period = resolvePeriod(from, to);
        String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        List<ExportEmployee> rows = leaveHistoryService.exportRows(period[0], period[1]).stream()
                .filter(row -> query.isEmpty()
                        || row.name().toLowerCase(Locale.ROOT).contains(query)
                        || nikText(row).contains(query))
                .toList();

        log(authentication, httpRequest, "EXPORT_HISTORI_CUTI",
                "Ekspor histori cuti (format ledger) ke Excel" + periodText(from, to)
                        + (query.isEmpty() ? "" : ", pencarian '" + query + "'"));
        return ResponseEntity.ok().contentType(XLSX).body(LeaveLedgerXlsx.write(rows));
    }

    // ---------------------------------------------------------------------------------------

    private static String nikText(ExportEmployee row) {
        return row.nikNumber() == null ? "" : String.format("%04d", row.nikNumber());
    }

    private static String periodText(String from, String to) {
        boolean hasFrom = from != null && !from.isBlank();
        boolean hasTo = to != null && !to.isBlank();
        if (!hasFrom && !hasTo) {
            return "";
        }
        return " periode " + (hasFrom ? from : "awal") + " s/d " + (hasTo ? to : "akhir");
    }

    // Mengembalikan {dari, sampai}; sisi yang kosong diganti batas terjauh. Null/null = tanpa batas periode.
    private static LocalDate[] resolvePeriod(String from, String to) {
        LocalDate fromDate = parseDate(from, "Tanggal dari");
        LocalDate toDate = parseDate(to, "Tanggal sampai");
        if (fromDate == null && toDate == null) {
            return new LocalDate[] {null, null};
        }
        LocalDate start = fromDate == null ? EARLIEST : fromDate;
        LocalDate end = toDate == null ? LATEST : toDate;
        if (start.isAfter(end)) {
            throw new IllegalArgumentException("Tanggal 'dari' tidak boleh setelah tanggal 'sampai'.");
        }
        return new LocalDate[] {start, end};
    }

    private static LocalDate parseDate(String value, String label) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(label + " tidak valid. Gunakan format YYYY-MM-DD.");
        }
    }

    private void log(Authentication authentication, HttpServletRequest httpRequest, String action, String description) {
        User user = userRepository.findByUsername(authentication.getName());
        activityLogService.log(authentication.getName(), user != null ? user.getUserId() : null,
                action, "leave_requests", null, description, httpRequest);
    }
}
