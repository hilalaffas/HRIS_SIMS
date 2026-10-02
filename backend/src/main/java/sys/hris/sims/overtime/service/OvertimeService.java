package sys.hris.sims.overtime.service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.overtime.dto.OvertimeResponse;
import sys.hris.sims.overtime.dto.OvertimeSubmitRequest;
import sys.hris.sims.overtime.entity.OvertimeRequest;
import sys.hris.sims.overtime.repository.OvertimeRepository;

@Service
@RequiredArgsConstructor
public class OvertimeService {

    private static final int MAX_REASON_LENGTH = 500;

    private final OvertimeRepository overtimeRepository;
    private final EmployeeRepository employeeRepository;

    public List<OvertimeResponse> getMyOvertime(String username) {
        Employee employee = resolveEmployee(username);
        return overtimeRepository
                .findByEmployee_EmployeeIdOrderByOvertimeDateDescOvertimeIdDesc(employee.getEmployeeId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // [BARU] Semua pengajuan lembur untuk halaman persetujuan SuperAdmin.
    public List<OvertimeResponse> getAllForApproval() {
        return overtimeRepository.findAllByOrderByOvertimeDateDescOvertimeIdDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // [BARU] Setujui / tolak lembur. Hanya yang masih PENDING yang bisa diputuskan.
    public OvertimeResponse decide(Long overtimeId, String decision) {
        String status = decision == null ? "" : decision.trim().toUpperCase(Locale.ROOT);
        if (!status.equals("APPROVED") && !status.equals("REJECTED")) {
            throw new IllegalArgumentException("Keputusan tidak valid. Gunakan APPROVED atau REJECTED.");
        }

        OvertimeRequest overtime = overtimeRepository.findById(overtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Pengajuan lembur tidak ditemukan."));
        if (!"PENDING".equals(overtime.getStatus())) {
            throw new IllegalStateException("Pengajuan ini sudah diproses.");
        }

        overtime.setStatus(status);
        return toResponse(overtimeRepository.save(overtime));
    }

    public OvertimeResponse submit(String username, OvertimeSubmitRequest request) {
        Employee employee = resolveEmployee(username);

        if (request.getOvertimeDate() == null) {
            throw new IllegalArgumentException("Tanggal lembur wajib diisi.");
        }
        if (request.getOvertimeDate().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Tanggal lembur tidak boleh melebihi hari ini.");
        }
        if (request.getStartTime() == null || request.getEndTime() == null) {
            throw new IllegalArgumentException("Jam mulai dan jam selesai wajib diisi.");
        }
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("Jam selesai harus lebih besar dari jam mulai.");
        }

        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isEmpty()) {
            throw new IllegalArgumentException("Alasan / pekerjaan lembur wajib diisi.");
        }
        if (reason.length() > MAX_REASON_LENGTH) {
            throw new IllegalArgumentException("Alasan lembur maksimal " + MAX_REASON_LENGTH + " karakter.");
        }

        if (overtimeRepository.existsByEmployee_EmployeeIdAndOvertimeDateAndStatusIn(
                employee.getEmployeeId(), request.getOvertimeDate(), List.of("PENDING", "APPROVED"))) {
            throw new IllegalArgumentException("Pengajuan lembur pada tanggal ini sudah ada.");
        }

        int totalMinutes = (int) Duration.between(request.getStartTime(), request.getEndTime()).toMinutes();

        OvertimeRequest saved = overtimeRepository.save(OvertimeRequest.builder()
                .employee(employee)
                .overtimeDate(request.getOvertimeDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .totalMinutes(totalMinutes)
                .reason(reason)
                .status("PENDING")
                .build());

        return toResponse(saved);
    }

    private Employee resolveEmployee(String username) {
        return employeeRepository.findFirstByUser_Username(username)
                .orElseThrow(() -> new IllegalStateException("Data karyawan tidak ditemukan untuk user ini"));
    }

    private OvertimeResponse toResponse(OvertimeRequest overtime) {
        return OvertimeResponse.builder()
                .overtimeId(overtime.getOvertimeId())
                .employeeId(overtime.getEmployee().getEmployeeId())
                .employeeName(overtime.getEmployee().getFullName())
                .overtimeDate(overtime.getOvertimeDate())
                .startTime(overtime.getStartTime())
                .endTime(overtime.getEndTime())
                .totalMinutes(overtime.getTotalMinutes())
                .reason(overtime.getReason())
                .status(overtime.getStatus())
                .createdAt(overtime.getCreatedAt())
                .build();
    }
}
