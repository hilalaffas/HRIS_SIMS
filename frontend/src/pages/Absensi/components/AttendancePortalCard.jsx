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
import { getTodayStatusConfig } from '../utils/todayStatusConfig';
import './AttendancePortalCard.css';

export default function AttendancePortalCard({
  attendanceStatus = 'idle',
  shiftContext,
  isLoading = false,
  disablePermission = false,
  leaveOpensLabel = '', // [BARU] jam absen dibuka (cuti setengah hari pagi), mis. "12:00"
  onStartAttendance,
  onOpenPermission,
}) {
  const statusConfig = getTodayStatusConfig(attendanceStatus, leaveOpensLabel); // [UBAH] + teks jam dibuka
  const MainIcon = statusConfig.buttonIcon;

  return (
    <section className="abs-portal-card">
      <div className="abs-portal-info">
        <h2>
          <Fingerprint aria-hidden="true" />
          Portal Absensi Harian Karyawan
        </h2>
        <p>{shiftContext?.label || 'Jadwal kerja, absensi, dan rekap otomatis.'}</p>
      </div>

      <div className="abs-portal-actions">
        <button
          type="button"
          className="abs-portal-button abs-portal-button--attendance"
          onClick={() => onStartAttendance(statusConfig.action)}
          disabled={!statusConfig.action || isLoading || (shiftContext && (!shiftContext.endsAt || (statusConfig.action === 'Masuk' && !shiftContext.canCheckIn)))}
        >
          <MainIcon aria-hidden="true" />
          {shiftContext && (!shiftContext.endsAt || (statusConfig.action === 'Masuk' && !shiftContext.canCheckIn)) ? shiftContext.blockedLabel : statusConfig.buttonLabel}
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
