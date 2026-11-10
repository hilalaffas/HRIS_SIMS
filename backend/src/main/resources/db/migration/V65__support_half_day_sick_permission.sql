ALTER TABLE attendances ALTER COLUMN leave_days TYPE DOUBLE PRECISION USING leave_days::double precision;
COMMENT ON COLUMN attendances.leave_days IS 'Durasi izin sakit dalam hari kerja; pulang cepat dapat 0.5 atau 1 hari';
