package sys.hris.sims.attendance.report;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sys.hris.sims.common.service.HiddenAccountPolicy;
import sys.hris.sims.employee.repository.EmployeeRepository;

@RestController
@RequestMapping("/api/absensi/laporan")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('HRD_ADMIN', 'SUPER_ADMIN')")
public class ReportRevisionController {
    private final ReportRevisionService service;
    private final HiddenAccountPolicy hiddenAccountPolicy; // [BARU] superadmin & dev tidak ada di laporan
    private final EmployeeRepository employeeRepository;
    @PostMapping("/{employeeId}/revisions")
    public ReportRevision save(@PathVariable Long employeeId, @RequestBody ReportRevisionService.EditRequest request, Authentication authentication) {
        // [BARU] Karyawan akun tersembunyi diperlakukan sama dengan ID yang tidak ada.
        employeeRepository.findById(employeeId)
                .ifPresent(target -> hiddenAccountPolicy.requireVisible(target, authentication.getName()));
        return service.save(employeeId, request, authentication.getName());
    }
}
