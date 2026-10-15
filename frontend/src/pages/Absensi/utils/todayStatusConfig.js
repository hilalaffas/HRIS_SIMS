// src/pages/Absensi/utils/todayStatusConfig.js
//
// [BARU] Satu sumber untuk teks, warna, dan ikon "status absen hari ini" --
// dipakai kartu ringkasan Dashboard (DashboardSummaryCard) DAN kartu absensi
// di halaman Absensi Saya (AttendanceCameraCard), supaya keduanya selalu sama.
//
// Kunci status: idle | checkedIn | done | sick
//   badge/badgeTone   = lencana kecil "STATUS HARI INI" (Dashboard)
//   pillLabel/pillTone/PillIcon = pil status di sebelah tombol
//   buttonLabel/buttonIcon      = tombol utama
//   action = jenis absen yang dibuka di popup ('Masuk' | 'Keluar'), null = tombol terkunci
import { Camera, CheckCircle2, LogOut, Stethoscope, XCircle } from 'lucide-react';

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
};
