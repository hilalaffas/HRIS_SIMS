// src/pages/Absensi/components/AttendancePortalCard.jsx
//
// [BARU] Kartu header "Portal Absensi Harian Karyawan" -- menggantikan kartu
// "Absensi Hari Ini" (AttendanceCameraCard) dan kartu "Status Hari Ini"
// (AttendanceTodayCard). Status hari ini sekarang cukup dilihat di baris
// "(Hari ini)" pada tabel riwayat.
//
// Dua tombol di kanan:
//  - tombol utama Absen Masuk/Keluar (teks, ikon, dan keadaan terkunci dari
//    utils/todayStatusConfig.js -- sama dengan kartu ringkasan Dashboard)
//  - "Ajukan Izin / Sakit" yang membuka popup pengajuan (tanpa selfie)
//
// Contoh pemakaian:
// <AttendancePortalCard attendanceStatus="idle" onStartAttendance={fn} onOpenPermission={fn} />
import React from 'react';
import { FilePenLine, Fingerprint } from 'lucide-react';
import { TODAY_STATUS_CONFIG } from '../utils/todayStatusConfig';
import './AttendancePortalCard.css';

export default function AttendancePortalCard({
  attendanceStatus = 'idle',
  isLoading = false,
  disablePermission = false,
  onStartAttendance,
  onOpenPermission,
}) {
  const statusConfig = TODAY_STATUS_CONFIG[attendanceStatus] ?? TODAY_STATUS_CONFIG.idle;
  const MainIcon = statusConfig.buttonIcon;

  return (
    <section className="abs-portal-card">
      <div className="abs-portal-info">
        <h2>
          <Fingerprint aria-hidden="true" />
          Portal Absensi Harian Karyawan
        </h2>
        <p>Jadwal kerja sebulan, absensi selfie real-time, izin sakit/terlambat, dan rekap otomatis.</p>
      </div>

      <div className="abs-portal-actions">
        <button
          type="button"
          className="abs-portal-button abs-portal-button--attendance"
          onClick={() => onStartAttendance(statusConfig.action)}
          disabled={!statusConfig.action || isLoading}
        >
          <MainIcon aria-hidden="true" />
          {statusConfig.buttonLabel}
        </button>
        <button
          type="button"
          className="abs-portal-button abs-portal-button--permission"
          onClick={onOpenPermission}
          disabled={disablePermission || isLoading}
        >
          <FilePenLine aria-hidden="true" />
          Ajukan Izin / Sakit
        </button>
      </div>
    </section>
  );
}
