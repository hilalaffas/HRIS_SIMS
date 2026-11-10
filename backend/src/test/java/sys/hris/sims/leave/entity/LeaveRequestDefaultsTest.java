package sys.hris.sims.leave.entity;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

// [BARU] Regression test: pengajuan cuti tidak boleh mengirim is_imported_history = null ke database.
class LeaveRequestDefaultsTest {

    @Test
    void prePersistFillsImportedHistoryWhenNull() {
        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setImportedHistory(null);

        leaveRequest.prePersist();

        assertThat(leaveRequest.getImportedHistory()).isFalse();
    }

    @Test
    void preUpdateFillsImportedHistoryWhenNull() {
        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setImportedHistory(null);

        leaveRequest.preUpdate();

        assertThat(leaveRequest.getImportedHistory()).isFalse();
    }

    @Test
    void prePersistKeepsImportedHistoryTrue() {
        LeaveRequest leaveRequest = LeaveRequest.builder().importedHistory(true).build();

        leaveRequest.prePersist();

        assertThat(leaveRequest.getImportedHistory()).isTrue();
    }
}
