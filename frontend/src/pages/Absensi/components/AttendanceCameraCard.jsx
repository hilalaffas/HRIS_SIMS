// src/pages/Absensi/components/AttendanceCameraCard.jsx
//
// Kartu "ABSENSI HARI INI" -- pil status absen, tombol utama Absen Masuk/Keluar,
// dan tombol Sakit. Realisasi dari desain UI/UX, dipecah jadi komponen sendiri
// mengikuti pola pages/Cuti/applycuti/components/*.
//
// [UBAH] Tombol utama & pil status kini SAMA dengan kartu ringkasan di
// Dashboard (teks, ikon, dan warna dari utils/todayStatusConfig.js):
// "Absen Masuk (Selfie)" -> "Absen Keluar (Selfie)" -> "Absensi Selesai"
// (abu-abu, disabled). Menekan tombol tidak lagi langsung membuka kamera di
// sini; absensi.jsx yang memutuskan (popup pulang cepat -> popup kamera).
//
// Contoh pemakaian:
// <AttendanceCameraCard attendanceStatus="idle" onStartAttendance={fn} onStartSick={fn} />
import React from 'react';
import { Stethoscope } from 'lucide-react';
import Skeleton from '../../../components/Skeleton';
import { TODAY_STATUS_CONFIG } from '../utils/todayStatusConfig';
import './AttendanceCameraCard.css';

export default function AttendanceCameraCard({
  attendanceStatus = 'idle',
  isLoading = false,
  disabledSakit,
  onStartAttendance,
  onStartSick,
}) {
  const statusConfig = TODAY_STATUS_CONFIG[attendanceStatus] ?? TODAY_STATUS_CONFIG.idle;
  const MainIcon = statusConfig.buttonIcon;
  const PillIcon = statusConfig.PillIcon;

  return (
    <div className="abs-camera-card">
      <div className="abs-card-head">
        <div className="abs-card-kicker">
          <span className="abs-live-dot" />
          ABSENSI HARI INI
        </div>

        {/* [BARU] Pil status -- menggantikan tombol/teks status lama, sama seperti di Dashboard */}
        {isLoading ? (
          <Skeleton width={110} height={28} style={{ borderRadius: 999 }} />
        ) : (
          <span
            key={attendanceStatus}
            className={`abs-status-pill abs-status-pill--${statusConfig.pillTone}`}
            role="status"
          >
            <PillIcon aria-hidden="true" />
            {statusConfig.pillLabel}
          </span>
        )}
      </div>

      <div className="abs-attendance-actions">
        <button
          type="button"
          className="abs-primary-button abs-checkin-button"
          onClick={() => onStartAttendance(statusConfig.action)}
          disabled={!statusConfig.action || isLoading}
        >
          <MainIcon aria-hidden="true" />
          {statusConfig.buttonLabel}
        </button>
        <button
          type="button"
          className="abs-tertiary-button"
          onClick={onStartSick}
          disabled={disabledSakit || isLoading}
        >
          <Stethoscope aria-hidden="true" />
          Sakit
        </button>
      </div>
    </div>
  );
}
