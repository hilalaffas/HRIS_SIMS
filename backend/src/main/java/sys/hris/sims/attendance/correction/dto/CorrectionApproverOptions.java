package sys.hris.sims.attendance.correction.dto;

import java.util.List;

public record CorrectionApproverOptions(List<Stage> stages) {
    public record Stage(String role, String field, List<Person> people) {}
    public record Person(Long employeeId, String fullName) {}
}
