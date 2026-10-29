// src/pages/Absensi/hooks/useTodayLeave.js
//
// [BARU] Memuat status cuti hari ini SEKALI, lalu menyalakan satu timer ke detik absen
// dibuka (cuti pagi) supaya tombol terbuka sendiri tanpa refresh halaman. Dipakai
// halaman Absensi Saya dan kartu ringkasan Dashboard (satu sumber, perilaku sama).
//
// Gagal memuat TIDAK mengunci tombol: server tetap menolak absen yang tidak boleh,
// jadi kegagalan di sini hanya berarti tombol tampil normal.
import { useEffect, useMemo, useState } from 'react';
import { getMyLeaveToday } from '../../../services/attendanceService';
import {
  NO_LEAVE_TODAY,
  formatClock,
  resolveLeaveGate,
  toDisplayLeaveToday,
} from '../utils/leaveToday';

const TIMER_SAFETY_MS = 500; // jeda kecil supaya jam sudah melewati batas saat dievaluasi ulang
const MAX_TIMER_MS = 2 ** 31 - 1; // batas setTimeout browser

export default function useTodayLeave() {
  const [leave, setLeave] = useState(NO_LEAVE_TODAY);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    getMyLeaveToday({ silent: true })
      .then((raw) => { if (!cancelled) setLeave(toDisplayLeaveToday(raw)); })
      .catch(() => { if (!cancelled) setLeave(NO_LEAVE_TODAY); });
    return () => { cancelled = true; };
  }, []);

  const gate = useMemo(() => resolveLeaveGate(leave, now), [leave, now]);

  // Saat terkunci menunggu cuti pagi berakhir: bangunkan komponen tepat saat absen dibuka.
  useEffect(() => {
    if (gate !== 'leaveWait' || !leave.opensAt) return undefined;
    const delay = Math.min(MAX_TIMER_MS, Math.max(0, leave.opensAt.getTime() - Date.now()) + TIMER_SAFETY_MS);
    const timerId = window.setTimeout(() => setNow(new Date()), delay);
    return () => window.clearTimeout(timerId);
  }, [gate, leave.opensAt]);

  return {
    leave,
    gate, // 'onLeave' | 'leaveWait' | null
    leaveTypeName: leave.leaveTypeName,
    leaveOpensLabel: formatClock(leave.opensAt), // "12:00" (kosong bila bukan cuti pagi)
  };
}
