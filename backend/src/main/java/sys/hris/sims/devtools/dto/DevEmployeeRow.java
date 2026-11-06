package sys.hris.sims.devtools.dto;

import java.time.LocalDate;

// [BARU] Satu baris daftar karyawan untuk panel edit NIK di /devAccess.
public record DevEmployeeRow(
        Long employeeId,
        String username,
        String fullName,
        String nikKaryawan,
        LocalDate joinDate,
        String divisi,
        String role) {
}
