-- [BARU] Nama lokasi hasil reverse geocoding (Google Geocoding API) untuk
-- setiap absensi, mis. "Jl. Jenderal Sudirman No.1, Jakarta Selatan".
-- Diisi BACKEND saat absen (bukan dari input klien) dan boleh NULL: absensi
-- tetap sah walau geocoding gagal / API key belum diatur. Data lama = NULL.
ALTER TABLE attendances ADD COLUMN location_name VARCHAR(255);

COMMENT ON COLUMN attendances.location_name IS 'Nama lokasi hasil reverse geocoding backend; NULL bila tidak tersedia';
