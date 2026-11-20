package sys.hris.sims.activity_logs.service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.activity_logs.entity.ActivityLog;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;
import sys.hris.sims.leave.repository.LeaveRepository;
import sys.hris.sims.passwordreset.repository.PasswordResetRequestRepository;

// [BARU] Mengganti ID di deskripsi Log Sistem dengan NAMA karyawan saat log DIBACA.
//
// Deskripsi log lama ditulis dengan ID, mis. "Menyetujui cuti id: 12" atau "Mengupdate karyawan id: 7 (...)".
// Di sini ID itu diganti nama:
//   - cuti (leave_requests)          -> nama pengaju cuti       "Menyetujui cuti Dedi"
//   - karyawan (employees)           -> nama karyawan           "Menonaktifkan karyawan Dedi"
//   - reset password (password_resets) -> nama pemohon          "Menyetujui permintaan reset password Dedi"
//   - entitas lain / data sudah dihapus -> teks ID dibuang saja ("Menghapus berita")
// Log yang tersimpan di database TIDAK diubah (hanya salinan yang dikirim ke tampilan), jadi log lama
// ikut rapi tanpa migrasi. Bila pencarian nama gagal, log asli dikembalikan apa adanya.
@Component
@RequiredArgsConstructor
public class ActivityLogDescriptionResolver {

    private static final Logger log = LoggerFactory.getLogger(ActivityLogDescriptionResolver.class);

    private static final String ENTITY_LEAVE = "leave_requests";
    private static final String ENTITY_EMPLOYEE = "employees";
    private static final String ENTITY_PASSWORD_RESET = "password_resets";

    // Cocok dengan " id: 12", " ID: 12", dan " dengan ID: 12".
    private static final Pattern ID_REFERENCE = Pattern.compile("\\s*(?:dengan\\s+)?\\b[Ii][Dd]:\\s*(\\d+)");
    // Cocok dengan "(#12, " pada log hitung ulang hari cuti (nama karyawan sudah ada di kalimatnya).
    private static final Pattern LEAVE_NUMBER = Pattern.compile("\\(#\\d+,\\s*");

    private final LeaveRepository leaveRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;

    @Transactional(readOnly = true)
    public List<ActivityLog> resolve(List<ActivityLog> logs) {
        if (logs == null || logs.isEmpty()) {
            return logs;
        }
        try {
            Map<String, Map<Long, String>> names = loadNames(logs);
            return logs.stream().map(entry -> rewrite(entry, names)).toList();
        } catch (RuntimeException ex) {
            log.warn("Gagal mengganti ID dengan nama di Log Sistem; log ditampilkan apa adanya", ex);
            return logs;
        }
    }

    // Kumpulkan ID yang dirujuk deskripsi, lalu muat namanya per entitas (satu query per jenis).
    private Map<String, Map<Long, String>> loadNames(List<ActivityLog> logs) {
        Map<String, Set<Long>> idsByEntity = new HashMap<>();
        for (ActivityLog entry : logs) {
            if (entry.getDescription() == null || entry.getEntity() == null) {
                continue;
            }
            Matcher matcher = ID_REFERENCE.matcher(entry.getDescription());
            while (matcher.find()) {
                Long id = parseId(matcher.group(1));
                if (id != null) {
                    idsByEntity.computeIfAbsent(entry.getEntity(), key -> new HashSet<>()).add(id);
                }
            }
        }

        Map<String, Map<Long, String>> names = new HashMap<>();
        Set<Long> leaveIds = idsByEntity.get(ENTITY_LEAVE);
        if (leaveIds != null) {
            Map<Long, String> byId = new HashMap<>();
            leaveRepository.findAllById(leaveIds).forEach(leave -> {
                if (leave.getEmployee() != null && leave.getEmployee().getFullName() != null) {
                    byId.put(leave.getLeaveRequestId(), leave.getEmployee().getFullName());
                }
            });
            names.put(ENTITY_LEAVE, byId);
        }
        Set<Long> employeeIds = idsByEntity.get(ENTITY_EMPLOYEE);
        if (employeeIds != null) {
            Map<Long, String> byId = new HashMap<>();
            employeeRepository.findAllById(employeeIds).forEach(employee -> {
                if (employee.getFullName() != null) {
                    byId.put(employee.getEmployeeId(), employee.getFullName());
                }
            });
            names.put(ENTITY_EMPLOYEE, byId);
        }
        Set<Long> resetIds = idsByEntity.get(ENTITY_PASSWORD_RESET);
        if (resetIds != null) {
            Map<Long, String> byId = new HashMap<>();
            passwordResetRequestRepository.findAllById(resetIds).forEach(request -> {
                if (request.getUser() == null) {
                    return;
                }
                String username = request.getUser().getUsername();
                String name = employeeRepository.findFirstByUser_Username(username)
                        .map(Employee::getFullName).orElse(username);
                byId.put(request.getId(), name);
            });
            names.put(ENTITY_PASSWORD_RESET, byId);
        }
        return names;
    }

    private ActivityLog rewrite(ActivityLog entry, Map<String, Map<Long, String>> names) {
        String original = entry.getDescription();
        if (original == null) {
            return entry;
        }
        Map<Long, String> entityNames = entry.getEntity() == null ? Map.of()
                : names.getOrDefault(entry.getEntity(), Map.of());

        String rewritten = ID_REFERENCE.matcher(original).replaceAll(match -> {
            Long id = parseId(match.group(1));
            String name = id == null ? null : entityNames.get(id);
            return Matcher.quoteReplacement(name == null ? "" : " " + name);
        });
        rewritten = LEAVE_NUMBER.matcher(rewritten).replaceAll("(");

        if (rewritten.equals(original)) {
            return entry;
        }
        // Salinan baru: entitas asli tidak diubah.
        return ActivityLog.builder()
                .logId(entry.getLogId())
                .userId(entry.getUserId())
                .username(entry.getUsername())
                .action(entry.getAction())
                .entity(entry.getEntity())
                .entityId(entry.getEntityId())
                .description(rewritten)
                .ipAddress(entry.getIpAddress())
                .createdAt(entry.getCreatedAt())
                .build();
    }

    private static Long parseId(String digits) {
        try {
            return Long.valueOf(digits);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
