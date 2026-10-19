-- Sakit yang DITOLAK tidak lagi memakai "jatah" satu Masuk per hari: karyawan boleh
-- Absen Masuk atau mengajukan Izin/Sakit lagi di hari yang sama. Catatan yang ditolak
-- tetap disimpan sebagai riwayat, jadi UNIQUE penuh diganti UNIQUE parsial yang
-- mengabaikan baris berstatus REJECTED (hanya reason SAKIT yang bisa REJECTED).
ALTER TABLE attendances DROP CONSTRAINT uq_attendance_per_day;

CREATE UNIQUE INDEX uq_attendance_per_day_active
    ON attendances (employee_id, attendance_date, action)
    WHERE approval_status <> 'REJECTED';
