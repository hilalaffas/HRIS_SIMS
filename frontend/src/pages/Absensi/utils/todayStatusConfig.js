// src/pages/Absensi/utils/todayStatusConfig.js
//
// [BARU] Satu sumber untuk teks, warna, dan ikon "status absen hari ini" --
// dipakai kartu ringkasan Dashboard (DashboardSummaryCard) DAN kartu absensi
// di halaman Absensi Saya (AttendancePortalCard), supaya keduanya selalu sama.
//
// Kunci status: idle | checkedIn | done | sick | sickPending | onLeave | leaveWait
//   [UBAH] sick = izin sakit SUDAH disetujui; sickPending = menunggu persetujuan.
//   Sakit yang ditolak tidak punya status sendiri: hari itu kembali "idle" (bisa absen).
//   badge/badgeTone   = lencana kecil "STATUS HARI INI" (Dashboard)
//   pillLabel/pillTone/PillIcon = pil status di sebelah tombol
//   buttonLabel/buttonIcon      = tombol utama
//   action = jenis absen yang dibuka di popup ('Masuk' | 'Keluar'), null = tombol terkunci
import { Camera, CalendarOff, CalendarClock, CheckCircle2, Clock, LogOut, Stethoscope, XCircle } from 'lucide-react';

export const TODAY_STATUS_CONFIG = {
  idle: {
    badge: 'Belum Absen Masuk', badgeTone: 'warning',
    pillLabel: 'Belum Absen', pillTone: 'danger', PillIcon: XCircle,
    buttonLabel: 'Absen Masuk (Selfie)', buttonIcon: Camera, action: 'Masuk',
  },
  checkedIn: {
    badge: 'Sedang Bekerja', badgeTone: 'success',
    pillLabel: 'Sudah Absen Masuk', pillTone: 'success', PillIcon: CheckCircle2,
    buttonLabel: 'Absen Keluar (Selfie)', buttonIcon: LogOut, action: 'Keluar',
  },
  done: {
    badge: 'Absensi Selesai', badgeTone: 'success',
    pillLabel: 'Absensi Selesai', pillTone: 'success', PillIcon: CheckCircle2,
    buttonLabel: 'Absensi Selesai', buttonIcon: CheckCircle2, action: null,
  },
  sick: {
    badge: 'Izin Sakit', badgeTone: 'info',
    pillLabel: 'Izin Sakit', pillTone: 'info', PillIcon: Stethoscope,
    buttonLabel: 'Izin Sakit Tercatat', buttonIcon: CheckCircle2, action: null,
  },
  // [BARU] Pengajuan sakit belum diputuskan atasan -- belum dianggap sakit.
  sickPending: {
    badge: 'Menunggu Approval', badgeTone: 'warning',
    pillLabel: 'Menunggu Approval', pillTone: 'warning', PillIcon: Clock,
    buttonLabel: 'Menunggu Approval Sakit', buttonIcon: Clock, action: null,
  },
  // [BARU] Cuti yang sudah DISETUJUI (lihat utils/leaveToday.js):
  //   onLeave   = cuti sehari penuh -> tombol terkunci seharian
  //   leaveWait = cuti setengah hari pagi -> terkunci sampai satu jam sebelum cuti berakhir
  onLeave: {
    badge: 'Sedang Cuti', badgeTone: 'info',
    pillLabel: 'Sedang Cuti', pillTone: 'info', PillIcon: CalendarOff,
    buttonLabel: 'Sedang Cuti Hari Ini', buttonIcon: CalendarOff, action: null,
  },
  leaveWait: {
    badge: 'Cuti Setengah Hari', badgeTone: 'info',
    pillLabel: 'Cuti Setengah Hari', pillTone: 'info', PillIcon: CalendarClock,
    buttonLabel: 'Absen Dibuka Sebentar Lagi', buttonIcon: CalendarClock, action: null,
  },
};

// [BARU] Konfigurasi status + teks dinamis: tombol 'leaveWait' menampilkan jam absen dibuka
// ("Absen Dibuka 12:00"). `opensLabel` kosong -> teks bawaan.
export function getTodayStatusConfig(status, opensLabel = '') {
  const config = TODAY_STATUS_CONFIG[status] ?? TODAY_STATUS_CONFIG.idle;
  if (status !== 'leaveWait' || !opensLabel) return config;
  return { ...config, buttonLabel: `Absen Dibuka ${opensLabel}` };
}
