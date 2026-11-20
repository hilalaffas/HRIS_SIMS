package sys.hris.sims.devtools.dto;

import java.math.BigDecimal;

// [BARU] Body edit Terpakai Ringkasan satu karyawan (alat dev).
//   usedLeave : angka Terpakai yang diinginkan (total sejak masuk, sama dengan kolom "Terpakai" di Ringkasan Cuti)
public record UpdateLeaveUsedRequest(BigDecimal usedLeave) {
}
