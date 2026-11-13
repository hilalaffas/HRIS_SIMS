ALTER TABLE attendances ADD COLUMN document_upload_deadline DATE;
UPDATE attendances SET document_upload_deadline =
    (date_trunc('month', COALESCE(recorded_at::date, attendance_date))
    + CASE WHEN EXTRACT(DAY FROM COALESCE(recorded_at::date, attendance_date)) > 20 THEN INTERVAL '1 month' ELSE INTERVAL '0 month' END
    + INTERVAL '19 days')::date
WHERE reason = 'SAKIT' AND document_required = TRUE;
