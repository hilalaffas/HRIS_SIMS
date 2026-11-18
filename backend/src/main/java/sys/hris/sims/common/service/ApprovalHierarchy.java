package sys.hris.sims.common.service;

import java.util.List;
import java.util.Locale;

// Shared by leave and attendance corrections so their stages cannot drift apart.
public final class ApprovalHierarchy {
    private ApprovalHierarchy() {}
    public static List<String> forRole(String roleName) {
        String role = roleName == null ? "" : roleName.trim().toUpperCase(Locale.ROOT).replace("ROLE_", "");
        if (HrdApproverPolicy.isHrdRoleName(role)) return List.of(HrdApproverPolicy.STAGE_ROLE);
        return switch (role) {
            case "LEADER" -> List.of("SPV", "MANAGER");
            case "SPV", "MANAGER" -> List.of("MANAGER");
            default -> List.of("LEADER", "SPV", "MANAGER");
        };
    }
}
