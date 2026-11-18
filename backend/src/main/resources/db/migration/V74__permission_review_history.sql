CREATE TABLE attendance_permission_events (
    attendance_id BIGINT NOT NULL REFERENCES attendances(attendance_id) ON DELETE CASCADE,
    event_index INTEGER NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    event_at TIMESTAMP NOT NULL,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(50),
    note VARCHAR(2000),
    before_start_date DATE, before_end_date DATE,
    after_start_date DATE, after_end_date DATE,
    document_url VARCHAR(500),
    approval_status VARCHAR(24), document_status VARCHAR(24),
    PRIMARY KEY (attendance_id, event_index)
);
-- Only known legacy facts are retained; earlier decisions/actors are not invented.
INSERT INTO attendance_permission_events (attendance_id, event_index, event_type, event_at, actor_name, actor_role, note)
SELECT a.attendance_id, 0, 'SUBMITTED', a.recorded_at, e.full_name, 'KARYAWAN',
    'Pengajuan tercatat. Data lama: rincian awal dan riwayat pemeriksaan sebelumnya tidak tersedia lengkap.'
FROM attendances a JOIN employees e ON e.employee_id = a.employee_id
WHERE a.reason IN ('SAKIT', 'IZIN') AND a.recorded_at IS NOT NULL;
INSERT INTO attendance_permission_events (attendance_id, event_index, event_type, event_at, actor_name, actor_role,
    note, after_start_date, after_end_date, document_url, approval_status, document_status)
SELECT a.attendance_id, CASE WHEN a.recorded_at IS NULL THEN 0 ELSE 1 END, 'LEGACY_SNAPSHOT',
    CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta', 'Data lama', 'SYSTEM',
    concat('Status terakhir saat pencatatan log dimulai. Catatan izin: ', COALESCE(a.review_note, '-'),
        '; Catatan surat: ', COALESCE(a.document_review_note, '-')),
    a.sick_start_date, a.sick_end_date,
    a.document_url, a.approval_status, a.document_review_status
FROM attendances a WHERE a.reason IN ('SAKIT', 'IZIN');
