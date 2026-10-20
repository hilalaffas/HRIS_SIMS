-- Persetujuan Surat Sakit & Izin: catatan peninjau untuk karyawan (wajib saat ditolak)
-- dan waktu keputusan (untuk statistik "Diproses bulan ini").
ALTER TABLE attendances
    ADD COLUMN review_note VARCHAR(500),
    ADD COLUMN reviewed_at TIMESTAMP;
