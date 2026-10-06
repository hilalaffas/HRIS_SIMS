// src/pages/Absensi/components/AttendanceTodayCard.jsx
//
// [BARU] Kartu "STATUS HARI INI" -- menampilkan jam check-in, check-out,
// dan total jam kerja hari ini berdasarkan data absensi (todayCheckIn /
// todayCheckOut dihitung di absensi.jsx dari daftar records).
import React from 'react';
import './AttendanceTodayCard.css';

function formatWorkedDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '-- jam -- menit';
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs <= 0) return '-- jam -- menit';
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} jam ${minutes} menit`;
}

export default function AttendanceTodayCard({ todayLabel, checkInRecord, checkOutRecord, isSick = false }) {
  const isDone = Boolean(checkInRecord && checkOutRecord);
  // [UBAH] `recordedAt` (Date asli dari backend, lihat
  // services/attendanceService.js toDisplayRecord()) dipakai langsung --
  // sebelumnya di sini ada regex parsing dari string "08:01 WIB" karena
  // dulu datanya cuma tersimpan sebagai teks di localStorage. Sekarang
  // backend adalah sumber datanya, jadi timestamp aslinya sudah tersedia.
  const workedLabel = formatWorkedDuration(
    checkInRecord?.recordedAt,
    checkOutRecord?.recordedAt,
  );

  return (
    <div className="abs-today-card">
      {/* [UBAH] Baris 1: judul + tanggal sebaris, badge di kanan -- tinggi
          baris disamakan dengan kartu "Absensi Hari Ini" (lihat CSS). */}
      <div className="abs-card-title-row">
        <div className="abs-title-inline">
          <p className="abs-eyebrow">STATUS HARI INI</p>
          <h2>{todayLabel}</h2>
        </div>
        <span className={`abs-status-badge ${isDone ? 'is-done' : ''} ${isSick ? 'is-sick' : ''}`.trim()}>
          {isSick ? 'Sakit' : isDone ? 'Selesai' : 'Belum selesai'}
        </span>
      </div>

      {/* [UBAH] Baris 2: Check-in | Check-out | Total jam kerja dalam 1 baris
          (sebelumnya "Total jam kerja" di baris terpisah di bawah). */}
      <div className="abs-time-row">
        <div>
          <span>Check-in</span>
          <strong>{checkInRecord ? checkInRecord.time : '--:-- WIB'}</strong>
        </div>
        <div className="abs-time-divider" />
        <div>
          <span>Check-out</span>
          <strong>{checkOutRecord ? checkOutRecord.time : '--:-- WIB'}</strong>
        </div>
        <div className="abs-time-divider" />
        <div>
          <span>Total jam kerja</span>
          <strong>{workedLabel}</strong>
        </div>
      </div>
    </div>
  );
}
