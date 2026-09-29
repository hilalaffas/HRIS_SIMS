// src/pages/Absensi/components/AttendanceCameraCard.jsx
//
// Kartu "ABSENSI HARI INI" -- ajakan untuk membuka kamera dan mencatat
// kehadiran (Masuk/Keluar/Sakit). Realisasi dari desain UI/UX, dipecah
// jadi komponen sendiri mengikuti pola pages/Cuti/applycuti/components/*.
//
// [UBAH] Sekarang ada 3 tombol (Masuk, Keluar, Sakit) bukan cuma 2 --
// ketiganya dibuat SEJAJAR & UKURANNYA PRESIS lewat CSS di
// AttendanceCameraCard.css (flex:1 rata, height tetap, box-sizing
// border-box), bukan lagi cuma mengandalkan padding. Tombol "Keluar"
// (dan "Sakit") otomatis abu-abu (disabled) begitu proses hari itu
// sudah selesai -- lihat prop disabledKeluar/disabledSakit yang dihitung
// di absensi.jsx dari data absensi hari ini.
import React from 'react';
import { Camera, LogOut, Stethoscope } from 'lucide-react';
import './AttendanceCameraCard.css';

export default function AttendanceCameraCard({
  onOpenCamera,
  disabledMasuk,
  disabledKeluar,
  disabledSakit,
}) {
  return (
    <div className="abs-camera-card">
      <div className="abs-card-kicker">
        <span className="abs-live-dot" />
        ABSENSI HARI INI
      </div>
      <h2>Sudah siap untuk mulai?</h2>
      <p>Ambil foto sebagai bukti kehadiran. Pastikan wajah Anda terlihat jelas dan berada di area kerja.</p>

      <div className="abs-camera-placeholder">
        <div className="abs-camera-icon">
          <Camera aria-hidden="true" />
        </div>
        <span>Foto Anda akan diambil melalui kamera</span>
      </div>

      <div className="abs-attendance-actions">
        <button
          type="button"
          className="abs-primary-button"
          onClick={() => onOpenCamera('Masuk', 'Absen')}
          disabled={disabledMasuk}
        >
          <Camera aria-hidden="true" />
          Masuk
        </button>
        <button
          type="button"
          className="abs-secondary-button"
          onClick={() => onOpenCamera('Keluar', 'Absen')}
          disabled={disabledKeluar}
        >
          <LogOut aria-hidden="true" />
          Keluar
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

      <small>
        <span>●</span> Kamera hanya digunakan saat absensi
      </small>
    </div>
  );
}
