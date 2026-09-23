-- [BARU] Fitur jadwal tayang pengumuman/berita:
--   publish_at : kapan berita mulai tampil ke karyawan. NULL/kosong = pakai
--                created_at (tayang langsung), diisi backend saat create
--                kalau checkbox "Kirim Sekarang" dicentang di frontend.
--   expires_at : kapan berita berhenti tampil otomatis. Default diisi
--                backend = publish_at + 30 hari kalau HR tidak mengubahnya
--                secara manual di form (lihat NewsServiceImpl.createNews()).
ALTER TABLE news
    ADD COLUMN publish_at TIMESTAMP,
    ADD COLUMN expires_at TIMESTAMP;

-- Berita yang sudah ada sebelum migrasi ini dianggap sudah tayang sejak
-- dibuat, supaya tidak tiba-tiba hilang dari dashboard begitu filter jadwal
-- mulai berlaku.
UPDATE news SET publish_at = created_at WHERE publish_at IS NULL;
