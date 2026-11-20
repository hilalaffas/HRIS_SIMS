package sys.hris.sims.devtools.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sys.hris.sims.devtools.dto.DevImportedLeaveRow;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.entity.LeaveRequest;
import sys.hris.sims.leave.repository.LeaveRepository;

// [BARU] Koreksi riwayat cuti HASIL IMPORT di /devAccess (mis. ada tanggal kelebihan di Excel).
//
// Aturan keamanan:
//   - Hanya catatan bertanda is_imported_history = true yang boleh dihapus. Pengajuan cuti ASLI
//     (dibuat karyawan lewat aplikasi) ditolak: menghapusnya mengubah saldo dan jejak persetujuan.
//   - Yang dihapus HANYA baris riwayatnya. Saldo / Ringkasan Cuti tidak disentuh:
//       * saldo sistem (LeaveService.getLeaveBalance) memang mengabaikan riwayat import (V56);
//       * ringkasan karyawan hasil import Excel (V64) dibaca dari kolom employees.import_*.
//     Jadi angka sisa, terpakai, hangus, dan total tetap sama sebelum dan sesudah hapus.
//   - Satu baris per permintaan, tanpa hapus massal.
@Service
public class DevImportedLeaveService {

    private final LeaveRepository leaveRepository;
    private final EmployeeRepository employeeRepository;
    private final DevAccessService devAccessService;

    public DevImportedLeaveService(LeaveRepository leaveRepository,
                                   EmployeeRepository employeeRepository,
                                   DevAccessService devAccessService) {
        this.leaveRepository = leaveRepository;
        this.employeeRepository = employeeRepository;
        this.devAccessService = devAccessService;
    }

    // Daftar riwayat import satu karyawan, tanggal terbaru di atas.
    @Transactional(readOnly = true)
    public List<DevImportedLeaveRow> listByEmployee(Long employeeId) {
        Employee employee = findEmployee(employeeId);
        return leaveRepository.findImportedHistoryByEmployee(employeeId).stream()
                .sorted(Comparator.comparing(LeaveRequest::getStartDate).reversed()
                        .thenComparing(LeaveRequest::getLeaveRequestId, Comparator.reverseOrder()))
                .map(leave -> toRow(leave, employee))
                .toList();
    }

    // Menghapus SATU baris riwayat import. Mengembalikan baris yang dihapus (untuk activity log).
    @Transactional
    public DevImportedLeaveRow deleteImported(Long leaveRequestId) {
        LeaveRequest leave = leaveRepository.findById(leaveRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Riwayat cuti tidak ditemukan."));
        if (!Boolean.TRUE.equals(leave.getImportedHistory())) {
            throw new IllegalArgumentException(
                    "Hanya riwayat hasil import yang boleh dihapus. Pengajuan cuti asli tidak bisa dihapus dari sini.");
        }
        Employee employee = leave.getEmployee();
        assertNotDevAccount(employee);

        DevImportedLeaveRow deleted = toRow(leave, employee); // dibaca SEBELUM dihapus
        leaveRepository.delete(leave);
        return deleted;
    }

    private Employee findEmployee(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Karyawan tidak ditemukan."));
        assertNotDevAccount(employee);
        return employee;
    }

    private void assertNotDevAccount(Employee employee) {
        if (employee.getUser() != null && devAccessService.isDevAccount(employee.getUser().getUsername())) {
            throw new IllegalArgumentException("Akun dev tidak punya riwayat cuti.");
        }
    }

    private static DevImportedLeaveRow toRow(LeaveRequest leave, Employee employee) {
        boolean forfeit = leave.getLeaveType() != null && Boolean.TRUE.equals(leave.getLeaveType().getForfeiture());
        return new DevImportedLeaveRow(
                leave.getLeaveRequestId(),
                employee.getEmployeeId(),
                employee.getFullName(),
                employee.getNikKaryawan(),
                leave.getStartDate(),
                leave.getEndDate(),
                leave.getTotalDays(),
                leave.getLeaveType() == null ? null : leave.getLeaveType().getName(),
                forfeit,
                employee.hasLeaveImportBaseline());
    }
}
