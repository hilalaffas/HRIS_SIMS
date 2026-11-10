package sys.hris.sims.leave.service;

import java.time.LocalDate;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.leave.entity.LeaveRule;
import sys.hris.sims.leave.repository.LeaveRuleRepository;

// [BARU] Satu-satunya sumber TANGGAL BERLAKU CUTI HANGUS. Nilai dibaca dari tabel leave_rules (V63);
// bila barisnya belum ada dipakai bawaan LeaveForfeitCalculator.FORFEIT_START_DATE (1 Januari 2025).
//
// Arti tanggal: hangus HANYA berlaku untuk tanggal hangus (hari terakhir periode anniversary)
// pada/setelah tanggal ini. Sisa sebelum tanggal ini tidak hangus (masuk Sisa Cuti Lama).
// Nilai 2999-12-31 (NEVER) = cuti tidak pernah hangus.
//
// Sengaja tanpa cache: dibaca per permintaan (pencarian by primary key, murni murah) supaya perubahan
// langsung berlaku di semua instance server.
@Service
@RequiredArgsConstructor
public class LeaveRuleService {

    public static final String FORFEIT_START_DATE_KEY = "FORFEIT_START_DATE";
    public static final LocalDate DEFAULT_FORFEIT_START_DATE = LeaveForfeitCalculator.FORFEIT_START_DATE;
    public static final LocalDate NEVER = LocalDate.of(2999, 12, 31);
    private static final LocalDate EARLIEST_ALLOWED = LocalDate.of(2000, 1, 1);

    private final LeaveRuleRepository leaveRuleRepository;

    @Transactional(readOnly = true)
    public LocalDate getForfeitStartDate() {
        return leaveRuleRepository.findById(FORFEIT_START_DATE_KEY)
                .map(LeaveRule::getDateValue)
                .orElse(DEFAULT_FORFEIT_START_DATE);
    }

    @Transactional
    public LocalDate setForfeitStartDate(LocalDate date, String updatedBy) {
        if (date == null) {
            throw new IllegalArgumentException("Tanggal berlaku cuti hangus wajib diisi (format YYYY-MM-DD).");
        }
        if (date.isBefore(EARLIEST_ALLOWED) || date.isAfter(NEVER)) {
            throw new IllegalArgumentException("Tanggal berlaku cuti hangus harus antara "
                    + EARLIEST_ALLOWED + " dan " + NEVER + " (" + NEVER + " = cuti tidak pernah hangus).");
        }
        LeaveRule rule = leaveRuleRepository.findById(FORFEIT_START_DATE_KEY).orElseGet(() -> {
            LeaveRule created = new LeaveRule();
            created.setRuleKey(FORFEIT_START_DATE_KEY);
            return created;
        });
        rule.setDateValue(date);
        rule.setUpdatedBy(updatedBy);
        leaveRuleRepository.save(rule);
        return date;
    }
}
