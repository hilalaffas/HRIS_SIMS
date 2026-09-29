-- [BARU] Tabel modul Absensi -- realisasi dari desain UI/UX halaman
-- Absensi (kartu ambil foto Masuk/Keluar, status hari ini, riwayat).
-- Terhubung ke tabel employees (sama seperti leave_requests), supaya
-- laporan gabungan Absensi + Cuti + data karyawan bisa dibuat nanti
-- tanpa perlu perubahan skema lagi -- lihat CATATAN_PERUBAHAN.md.
CREATE TABLE attendances (
    attendance_id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(employee_id),

    -- 'MASUK' atau 'KELUAR'
    action VARCHAR(10) NOT NULL,

    -- 'ABSEN' (normal), 'SAKIT', atau 'IZIN'
    reason VARCHAR(10) NOT NULL DEFAULT 'ABSEN',

    -- Status hasil (dihitung backend, BUKAN input user):
    -- 'ON_TIME', 'LATE', 'DONE', 'SICK', 'IZIN'
    status VARCHAR(20) NOT NULL,

    note VARCHAR(255),

    -- URL foto selfie bukti kehadiran (Cloudinary, folder "attendance")
    photo_url VARCHAR(500) NOT NULL,

    -- Koordinat GPS presisi tinggi (7 desimal ~ 1.1cm) -- dipakai untuk
    -- membangun link Google Maps di sisi backend (AttendanceService)
    -- maupun ditampilkan mentah di riwayat.
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(11, 7) NOT NULL,

    -- Jam absen yang SAH -- diisi backend dari jam server (LocalDateTime.now()),
    -- bukan jam perangkat/browser user, supaya tidak bisa dimanipulasi klien.
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Kolom tanggal terpisah (turunan dari recorded_at, diisi backend)
    -- supaya constraint UNIQUE di bawah bisa menegakkan "1x Masuk & 1x
    -- Keluar per karyawan per hari" langsung di level database, bukan
    -- cuma validasi aplikasi yang bisa lolos kalau ada race condition.
    attendance_date DATE NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_attendance_per_day UNIQUE (employee_id, attendance_date, action)
);

CREATE INDEX idx_attendance_employee ON attendances(employee_id, attendance_date DESC);

COMMENT ON COLUMN attendances.action IS 'MASUK atau KELUAR';
COMMENT ON COLUMN attendances.reason IS 'ABSEN (normal), SAKIT, atau IZIN';
COMMENT ON COLUMN attendances.status IS 'Hasil perhitungan backend: ON_TIME, LATE, DONE, SICK, IZIN';
COMMENT ON COLUMN attendances.recorded_at IS 'Jam absen sah, diisi dari jam server saat submit -- bukan jam klien';
