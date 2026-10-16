-- [UBAH] Lama izin sakit dihitung dalam HARI KERJA (Sabtu & Minggu tidak dihitung),
-- bukan hari kalender seperti tertulis di komentar V45. Hanya komentar kolom --
-- struktur & data tidak berubah.
COMMENT ON COLUMN attendances.leave_days IS 'Lama izin sakit (hari kerja, tanpa Sabtu/Minggu) mulai dari attendance_date; default 1';
