ALTER TABLE attendances ADD COLUMN sick_start_date DATE;
ALTER TABLE attendances ADD COLUMN sick_end_date DATE;
ALTER TABLE attendances ADD CONSTRAINT ck_sick_calendar_range CHECK (
 (sick_start_date IS NULL AND sick_end_date IS NULL) OR
 (sick_start_date IS NOT NULL AND sick_end_date IS NOT NULL AND sick_end_date >= sick_start_date)
);
COMMENT ON COLUMN attendances.sick_start_date IS 'Inclusive calendar start for new sick requests; NULL retains legacy working-day coverage';
COMMENT ON COLUMN attendances.sick_end_date IS 'Inclusive calendar end for new sick requests';
