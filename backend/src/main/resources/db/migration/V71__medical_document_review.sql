ALTER TABLE attendances
    ADD COLUMN document_review_status VARCHAR(24) NOT NULL DEFAULT 'NOT_REQUIRED',
    ADD COLUMN document_review_note VARCHAR(500),
    ADD COLUMN document_reviewed_at TIMESTAMP;

-- Existing attachments have not been independently verified; queue them for HRD.
UPDATE attendances SET document_review_status = CASE
    WHEN NULLIF(TRIM(document_url), '') IS NULL THEN 'NOT_UPLOADED'
    ELSE 'PENDING' END
WHERE reason = 'SAKIT' AND document_required = TRUE;

ALTER TABLE attendances ADD CONSTRAINT ck_attendance_document_review_status
    CHECK (document_review_status IN ('NOT_REQUIRED', 'NOT_UPLOADED', 'PENDING', 'VALID', 'REJECTED'));
