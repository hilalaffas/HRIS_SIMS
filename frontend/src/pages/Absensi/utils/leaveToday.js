// src/pages/Absensi/utils/leaveToday.js
//
// [BARU] Hubungan CUTI -> tombol absen (sisi tampilan). ATURAN SEBENARNYA ada di
// backend (LeaveAttendancePolicy); file ini hanya menerjemahkan jawaban
// GET /api/absensi/me/leave-today menjadi status tombol supaya karyawan tidak perlu
// menekan tombol lalu ditolak server.
//
//   FULL_DAY      -> status 'onLeave'    : tombol terkunci seharian
//   HALF_MORNING  -> status 'leaveWait'  : terkunci sampai `opensAt` (satu jam sebelum
//                    cuti berakhir), lalu tombol normal
//   HALF_AFTERNOON-> tombol normal (karyawan bekerja pagi)
//
// Fungsi murni (tanpa React) supaya mudah dites.
import { jakartaWallClock } from './activeWorkShift';
import { parseNaiveDateTime } from '../../../services/attendanceService';

export const LEAVE_MODE = Object.freeze({
  NONE: 'NONE',
  FULL_DAY: 'FULL_DAY',
  HALF_MORNING: 'HALF_MORNING',
  HALF_AFTERNOON: 'HALF_AFTERNOON',
});

export const NO_LEAVE_TODAY = Object.freeze({
  mode: LEAVE_MODE.NONE, leaveTypeName: '', boundary: null, opensAt: null,
});

// Respons backend -> bentuk siap pakai (waktu jadi Date lokal).
export function toDisplayLeaveToday(raw) {
  if (!raw || !raw.mode || raw.mode === LEAVE_MODE.NONE) return NO_LEAVE_TODAY;
  return {
    mode: raw.mode,
    leaveRequestId: raw.leaveRequestId,
    workDate: raw.workDate,
    canCancel: Boolean(raw.canCancel),
    workStart: parseNaiveDateTime(raw.workStart),
    workEnd: parseNaiveDateTime(raw.workEnd),
    requiredMinutes: raw.requiredMinutes,
    leaveTypeName: raw.leaveTypeName || 'Cuti',
    boundary: parseNaiveDateTime(raw.boundary),
    opensAt: parseNaiveDateTime(raw.opensAt),
  };
}

// 'onLeave' | 'leaveWait' | null (null = cuti tidak menghalangi absen saat ini).
export function resolveLeaveGate(leave, now = new Date()) {
  if (leave.mode === LEAVE_MODE.FULL_DAY) return 'onLeave';
  if (leave.mode === LEAVE_MODE.HALF_MORNING && leave.opensAt && now < leave.opensAt) return 'leaveWait';
  return null;
}

// Status dasar (idle | checkedIn | done | sick | sickPending) + gerbang cuti.
// Sakit selalu menang (aturannya sudah ada); 'leaveWait' hanya menimpa 'idle'.
export function applyLeaveGate(baseStatus, gate) {
  if (!gate || baseStatus === 'sick' || baseStatus === 'sickPending') return baseStatus;
  if (gate === 'onLeave') return 'onLeave';
  return baseStatus === 'idle' ? 'leaveWait' : baseStatus;
}

export const formatClock = (date) => (date
  ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  : '');

export function applyLeaveSession(context, leave, now = new Date()) {
  if (!leave?.workStart || !leave?.workEnd || leave.workDate !== context.workDate || !leave.mode.startsWith('HALF_')) return context;
  const clock = date => `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  const ended = leave.mode === 'HALF_AFTERNOON' && jakartaWallClock(now) >= leave.workEnd;
  const canCheckIn = context.canCheckIn && !ended && (!leave.opensAt || jakartaWallClock(now) >= leave.opensAt);
  const hoursLabel = `${clock(leave.workStart)} - ${clock(leave.workEnd)}`;
  return { ...context, startsAt:leave.workStart, endsAt:leave.workEnd, requiredWorkHours:leave.requiredMinutes/60,
    requiredAttendanceHours:leave.requiredMinutes/60, hoursLabel, label:`${context.shiftName} · Sesi kerja ${hoursLabel} WIB`,
    canCheckIn, blockedLabel:ended ? 'Sesi kerja pagi sudah selesai' : canCheckIn ? '' : `Absen Dibuka ${clock(leave.opensAt || leave.workStart)}`,
    halfDayLeave:true };
}
