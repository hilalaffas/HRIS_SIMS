// src/constants/holidays.js
//
// [UBAH] Data CADANGAN hari libur 2026 -- hanya dipakai bila API /api/holidays gagal dimuat.
// Sumber: SKB 3 Menteri No. 1497/2025, 2/2025, 5/2025 (libur nasional + cuti bersama).
// Daftar sebelumnya salah banyak tanggal (mis. Maulid Nabi tertulis 25 September, padahal 25 Agustus),
// sehingga Jumat 25 Sep 2026 tampil "Libur". Data utama tetap tabel `holidays` di database.
export const LOCAL_HOLIDAYS_2026 = {
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
  '2026-02-16': 'Cuti Bersama Tahun Baru Imlek',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-18': 'Cuti Bersama Hari Suci Nyepi',
  '2026-03-19': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
  '2026-03-20': 'Cuti Bersama Idul Fitri 1447 H',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 H (Hari 1)',
  '2026-03-22': 'Hari Raya Idul Fitri 1447 H (Hari 2)',
  '2026-03-23': 'Cuti Bersama Idul Fitri 1447 H',
  '2026-03-24': 'Cuti Bersama Idul Fitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-04-05': 'Kebangkitan Yesus Kristus (Paskah)',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-15': 'Cuti Bersama Kenaikan Yesus Kristus',
  '2026-05-27': 'Hari Raya Idul Adha 1447 H',
  '2026-05-28': 'Cuti Bersama Idul Adha 1447 H',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': 'Tahun Baru Islam 1448 H',
  '2026-08-17': 'Hari Kemerdekaan Republik Indonesia',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-24': 'Cuti Bersama Hari Raya Natal',
  '2026-12-25': 'Hari Raya Natal',
};
