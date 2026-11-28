// src/pages/Absensi/utils/dayOffStatus.js
//
// [BARU] Hari libur / OFF MENGALAHKAN cuti pada status absen hari ini.
// Contoh: cuti 27-30 Nov, hari ini Sabtu 28 -> status tampil "holiday" (Hari Libur),
// bukan "onLeave" (Sedang Cuti). Sama dengan aturan hitung jatah cuti: hari libur tidak
// memotong saldo, jadi juga bukan hari cuti.
//
// `context` = hasil resolveActiveWorkShift(); `dayOff: true` diberikan saat hari itu libur
// (Sabtu/Minggu/libur nasional pada divisi Regular, atau hari OFF pada divisi Shifting).
// Hanya status "belum bekerja" (idle / onLeave / leaveWait) yang diganti: yang sedang
// bekerja (checkedIn), selesai (done), dan sakit tetap apa adanya. Lembur hari libur yang
// disetujui TIDAK memakai dayOff (konteksnya konteks lembur), jadi tombol absennya tetap aktif.
//
// Fungsi murni (tanpa React) supaya mudah dites.
const REPLACEABLE_STATUS = ['idle', 'onLeave', 'leaveWait'];

export function applyDayOff(status, context) {
  if (!context?.dayOff) return status;
  return REPLACEABLE_STATUS.includes(status) ? 'holiday' : status;
}
