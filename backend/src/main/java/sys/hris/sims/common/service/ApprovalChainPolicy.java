package sys.hris.sims.common.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.employee.entity.Employee;
import sys.hris.sims.employee.repository.EmployeeRepository;

// [BARU] Satu-satunya tempat aturan "pemohon dengan jabatan X harus melewati tahap approval apa saja".
// Dipakai Lembur; Cuti memakai aturan yang sama (lihat LeaveService.createApprovalSteps).
//
//   Pemohon        Tahap approval (berurutan)
//   -------------  -------------------------------
//   HRD            HRD
//   Member         Leader -> SPV -> Manager
//   Leader         SPV -> Manager
//   SPV            Manager
//   Manager        Manager (Manager lain, bukan dirinya sendiri)
//
// Mengubah jenjang cukup dengan mengubah requiredStages() -- backend dan validasi ikut berubah.
@Component
@RequiredArgsConstructor
public class ApprovalChainPolicy {

    public static final String STAGE_LEADER = "LEADER";
    public static final String STAGE_SPV = "SPV";
    public static final String STAGE_MANAGER = "MANAGER";
    public static final String STAGE_HRD = HrdApproverPolicy.STAGE_ROLE;

    // Urutan tahap untuk pengurutan tampilan & pengecekan giliran.
    private static final List<String> STAGE_ORDER = List.of(STAGE_LEADER, STAGE_SPV, STAGE_MANAGER, STAGE_HRD);

    private final HrdApproverPolicy hrdApproverPolicy;
    private final EmployeeRepository employeeRepository;
    private final ApproverScopePolicy approverScopePolicy; // [BARU] Leader/SPV satu divisi & opsional, Manager lintas divisi

    // Tahap approval yang WAJIB dilalui pengajuan milik `requester`.
    public static List<String> requiredStages(Employee requester) {
        if (HrdApproverPolicy.isHrd(requester)) {
            return List.of(STAGE_HRD);
        }
        return switch (roleOf(requester)) {
            case STAGE_LEADER -> List.of(STAGE_SPV, STAGE_MANAGER);
            case STAGE_SPV -> List.of(STAGE_MANAGER);
            case STAGE_MANAGER -> List.of(STAGE_MANAGER);
            default -> List.of(STAGE_LEADER, STAGE_SPV, STAGE_MANAGER);
        };
    }

    // Kode tahap yang dipegang seorang karyawan saat ia menjadi approver (HRD_ADMIN/HRD_KARYAWAN -> "HRD").
    public static String stageOf(Employee employee) {
        return HrdApproverPolicy.isHrd(employee) ? STAGE_HRD : roleOf(employee);
    }

    // Peringkat tahap; kode tak dikenal diletakkan paling akhir.
    public static int stageRank(String stageRole) {
        int index = STAGE_ORDER.indexOf(stageRole == null ? "" : stageRole.trim().toUpperCase(Locale.ROOT));
        return index < 0 ? STAGE_ORDER.size() : index;
    }

    // Validasi di server (jangan percaya dropdown frontend) lalu kembalikan approver per tahap,
    // berurutan sesuai requiredStages(). `selectedIdForStage` memberi id approver yang dipilih untuk sebuah tahap;
    // pilihan untuk tahap yang tidak diperlukan pemohon diabaikan.
    public Map<String, Employee> resolveApprovers(Employee requester, Function<String, Long> selectedIdForStage) {
        Map<String, Employee> approvers = new LinkedHashMap<>();
        for (String stage : requiredStages(requester)) {
            Long selectedId = selectedIdForStage.apply(stage);
            // [BARU] Leader/SPV yang dikosongkan ("-") dilewati; Manager & HRD tetap wajib.
            if (ApproverScopePolicy.isOptionalStage(stage) && (selectedId == null || selectedId <= 0)) {
                continue;
            }
            approvers.put(stage, STAGE_HRD.equals(stage)
                    ? hrdApproverPolicy.requireSelectableApprover(selectedId, requester)
                    : requireStageApprover(stage, selectedId, requester));
        }
        return approvers;
    }

    // Aturan sama dengan LeaveService.getSelectedApprover(): role tepat sesuai tahap, aktif,
    // satu divisi dengan pemohon (kecuali Manager: divisi mana pun), dan bukan pemohon sendiri (Manager memilih Manager lain).
    private Employee requireStageApprover(String stage, Long approverId, Employee requester) {
        if (approverId == null || approverId <= 0) {
            throw new IllegalArgumentException("Approver " + stage + " wajib dipilih.");
        }
        Employee approver = employeeRepository.findById(approverId)
                .orElseThrow(() -> new IllegalArgumentException("Approver " + stage + " tidak ditemukan."));
        if (!stage.equals(stageOf(approver))) {
            throw new IllegalArgumentException("Approver yang dipilih harus memiliki role " + stage + ".");
        }
        if (!Boolean.TRUE.equals(approver.getIsActive())) {
            throw new IllegalArgumentException("Approver " + stage + " sudah tidak aktif.");
        }
        if (approver.getEmployeeId().equals(requester.getEmployeeId())) {
            throw new IllegalArgumentException("Anda tidak dapat memilih diri sendiri sebagai approver.");
        }
        if (requester.getDivisi() == null) {
            throw new IllegalArgumentException("Divisi pemohon belum ditentukan.");
        }
        // [UBAH] Leader/SPV harus satu divisi; Manager boleh dari divisi mana pun (ApproverScopePolicy).
        if (!approverScopePolicy.allowsApprover(requester, approver, stage)) {
            throw new IllegalArgumentException(
                    "Approver " + stage + " harus berasal dari divisi yang sama dengan pemohon.");
        }
        return approver;
    }

    private static String roleOf(Employee employee) {
        if (employee == null || employee.getUser() == null || employee.getUser().getRoleId() == null) {
            return "";
        }
        String roleName = employee.getUser().getRoleId().getRoleName();
        return roleName == null ? "" : roleName.trim().toUpperCase(Locale.ROOT);
    }
}
