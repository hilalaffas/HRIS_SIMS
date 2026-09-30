package sys.hris.sims.shift.dto;

// [BARU] Format jam "HH:mm", contoh "07:00".
public record ShiftUpdateRequest(String startTime, String endTime) {
}
