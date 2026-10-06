// src/pages/Absensi/components/AttendanceCameraCard.jsx
//
// Kartu "ABSENSI HARI INI" -- ajakan untuk membuka kamera dan mencatat
// kehadiran (Masuk/Keluar/Sakit). Realisasi dari desain UI/UX, dipecah
// jadi komponen sendiri mengikuti pola pages/Cuti/applycuti/components/*.
//
// [UBAH] Tombol Masuk & Keluar disatukan jadi SATU tombol utama yang
// berganti Masuk -> Keluar -> "Absensi selesai" (abu-abu, disabled),
// ditambah tombol Sakit. Statusnya datang dari prop attendanceStatus yang
// dihitung di absensi.jsx dari data absensi hari ini, jadi otomatis
// kembali ke "Masuk" saat ganti hari. Kedua tombol dibuat SEJAJAR &
// UKURANNYA PRESIS lewat AttendanceCameraCard.css (flex:1, height tetap).
import React from 'react';
import { Camera, CheckCircle2, LogOut, Stethoscope } from 'lucide-react';
import './AttendanceCameraCard.css';

// Satu tombol utama dengan 3 kondisi: Masuk -> Keluar -> Selesai (disabled).
const MAIN_BUTTON_CONFIG = {
  idle: { label: 'Masuk', icon: Camera, action: 'Masuk', className: '' },
  checkedIn: { label: 'Keluar', icon: LogOut, action: 'Keluar', className: 'is-checkout' },
  done: { label: 'Absensi selesai', icon: CheckCircle2, action: null, className: '' },
  // [BARU] Karyawan sakit hari ini: tombol dikunci seperti kondisi sudah keluar.
  sick: { label: 'Izin sakit tercatat', icon: CheckCircle2, action: null, className: '' },
};

export default function AttendanceCameraCard({
  onOpenCamera,
  attendanceStatus = 'idle',
  disabledSakit,
}) {
  const mainButton = MAIN_BUTTON_CONFIG[attendanceStatus] ?? MAIN_BUTTON_CONFIG.idle;
  const MainIcon = mainButton.icon;
  const isDone = attendanceStatus === 'done' || attendanceStatus === 'sick'; // [UBAH] sick ikut terkunci

  return (
    <div className="abs-camera-card">
      <div className="abs-card-kicker">
        <span className="abs-live-dot" />
        ABSENSI HARI INI
      </div>
      {/* [UBAH] Teks "Sudah siap untuk mulai?", paragraf, dan kotak placeholder
          foto dihapus supaya kartu ringkas sesuai referensi UI. */}
      <div className="abs-attendance-actions">
        <button
          type="button"
          className={`abs-primary-button ${mainButton.className}`.trim()}
          onClick={() => onOpenCamera(mainButton.action, 'Absen')}
          disabled={isDone}
        >
          <MainIcon aria-hidden="true" />
          {mainButton.label}
        </button>
        <button
          type="button"
          className="abs-tertiary-button"
          onClick={() => onOpenCamera('Masuk', 'Sakit')}
          disabled={disabledSakit}
        >
          <Stethoscope aria-hidden="true" />
          Sakit
        </button>
      </div>
    </div>
  );
}
