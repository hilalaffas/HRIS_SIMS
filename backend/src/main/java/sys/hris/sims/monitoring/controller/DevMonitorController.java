package sys.hris.sims.monitoring.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.devtools.service.DevAccessService;
import sys.hris.sims.monitoring.service.RequestEventService;
import sys.hris.sims.monitoring.service.RequestMetrics;

// [BARU] Data panel Monitoring (/devAccess -> tab Monitoring). Dua lapis penjagaan, sama seperti
// DevToolsController: SecurityConfig (/api/dev/** hanya SUPER_ADMIN/DEV) lalu DevAccessService di sini.
// Penolakan lewat ResponseEntity 403, bukan exception, karena GlobalExceptionHandler mengubah
// semua exception menjadi 400.
@RestController
@RequestMapping("/api/dev/monitor")
@RequiredArgsConstructor
public class DevMonitorController {

    private static final String FORBIDDEN_MESSAGE = "Hanya akun dev yang boleh memakai alat ini.";

    private final DevAccessService devAccessService;
    private final RequestMetrics requestMetrics;
    private final RequestEventService requestEventService;

    // Ringkasan performa sejak server menyala (semua request, dihitung di memori).
    @GetMapping("/summary")
    public ResponseEntity<?> summary(Authentication authentication) {
        if (!devAccessService.isDevAccount(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(FORBIDDEN_MESSAGE);
        }
        return ResponseEntity.ok(requestMetrics.snapshot());
    }

    // Kejadian tersimpan: kind = all | error | slow | write; q = kata kunci; terbaru dulu.
    @GetMapping("/events")
    public ResponseEntity<?> events(@RequestParam(defaultValue = "all") String kind,
                                    @RequestParam(required = false) String q,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "25") int size,
                                    Authentication authentication) {
        if (!devAccessService.isDevAccount(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(FORBIDDEN_MESSAGE);
        }
        return ResponseEntity.ok(requestEventService.search(kind, q, page, size));
    }
}
