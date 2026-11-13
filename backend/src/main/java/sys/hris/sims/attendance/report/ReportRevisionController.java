package sys.hris.sims.attendance.report;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/absensi/laporan")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('HRD_ADMIN', 'SUPER_ADMIN')")
public class ReportRevisionController {
    private final ReportRevisionService service;
    @PostMapping("/{employeeId}/revisions")
    public ReportRevision save(@PathVariable Long employeeId, @RequestBody ReportRevisionService.EditRequest request, Authentication authentication) {
        return service.save(employeeId, request, authentication.getName());
    }
}
