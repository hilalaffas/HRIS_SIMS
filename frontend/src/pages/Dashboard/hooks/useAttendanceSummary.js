// src/pages/Dashboard/hooks/useAttendanceSummary.js
//
// [BARU] Data untuk kartu ringkasan Dashboard: rekap presensi periode
// berjalan (tutup buku tgl 21 - 20), status absen hari ini, dan divisi.
// Memakai ulang buildMonthlyRows() dari modul Absensi supaya angka di
// Dashboard SAMA PERSIS dengan tabel "Jadwal & Log Absensi Bulanan".
import { useCallback, useEffect, useRef, useState } from 'react'; // [UBAH] + useCallback, useRef
import { getMyAttendanceHistory, toDisplayRecord } from '../../../services/attendanceService';
import { getMyProfile } from '../../../services/profileService';
import {
  buildMonthlyRows,
  dateKey,
  formatPeriodLabel,
  getCurrentPeriod,
} from '../../Absensi/utils/monthlyAttendance';

const MONTH_FORMAT = { month: 'short', year: 'numeric' };

const INITIAL_STATE = {
  isLoading: true,
  hasError: false,
  present: 0,
  late: 0,
  permit: 0,
  periodShort: '',
  periodRange: '',
  todayStatus: 'idle', // idle | checkedIn | done | sick
  checkInTime: '',
  checkInAt: null, // [BARU] Date jam Masuk hari ini -- dasar hitung "pulang cepat"
  division: '',
};

// Hitung rekap dari baris harian. "Izin / Cuti" = IZIN + SAKIT dari absensi.
function summarizeRows(rows) {
  const countTone = (...tones) => rows.filter((row) => tones.includes(row.tone)).length;
  return {
    present: countTone('hadir', 'telat'), // terlambat tetap dihitung hadir
    late: countTone('telat'),
    permit: countTone('cuti', 'sakit'),
  };
}

function resolveTodayStatus(records, todayKey) {
  const todays = records.filter((record) => record.attendanceDate === todayKey);
  const checkIn = todays.find((record) => record.actionCode === 'MASUK');
  const checkOut = todays.find((record) => record.actionCode === 'KELUAR');
  const isSick = Boolean(checkIn && checkIn.reasonCode !== 'ABSEN');

  let todayStatus = 'idle';
  if (isSick) todayStatus = 'sick';
  else if (checkOut) todayStatus = 'done';
  else if (checkIn) todayStatus = 'checkedIn';

  return {
    todayStatus,
    checkInTime: isSick ? '' : checkIn?.time || '',
    checkInAt: isSick ? null : checkIn?.recordedAt || null, // [BARU]
  };
}

// [UBAH] Pengambilan data dipisah dari React (tidak memanggil setState) supaya
// bisa dipakai efek awal DAN `refresh`. Mengembalikan state baru, atau null bila gagal.
async function loadSummary() {
  try {
    // Profil hanya untuk nama divisi -- kegagalannya tidak boleh menggagalkan rekap.
    const [history, profile] = await Promise.all([
      getMyAttendanceHistory(),
      getMyProfile().catch(() => null),
    ]);

    const now = new Date();
    const records = (history || []).map(toDisplayRecord);
    const { year, month } = getCurrentPeriod(now);
    const rows = buildMonthlyRows(records, year, month, now);
    const periodEnd = new Date(year, month, 1);

    return {
      isLoading: false,
      hasError: false,
      ...summarizeRows(rows),
      periodShort: periodEnd.toLocaleDateString('id-ID', MONTH_FORMAT),
      periodRange: formatPeriodLabel(year, month),
      ...resolveTodayStatus(records, dateKey(now)),
      division: profile?.divisi && profile.divisi !== '-' ? profile.divisi : '',
    };
  } catch {
    return null;
  }
}

// Gagal saat pertama kali -> state error; gagal saat refresh -> angka lama dipertahankan.
const applyResult = (previous, next) => {
  if (next) return next;
  return previous.isLoading
    ? { ...INITIAL_STATE, isLoading: false, hasError: true }
    : { ...previous, hasError: true };
};

export default function useAttendanceSummary() {
  const [state, setState] = useState(INITIAL_STATE);
  const isMountedRef = useRef(true); // [BARU] cegah setState setelah unmount

  useEffect(() => {
    isMountedRef.current = true;
    loadSummary().then((next) => {
      if (isMountedRef.current) setState((previous) => applyResult(previous, next));
    });
    return () => { isMountedRef.current = false; };
  }, []);

  // [BARU] Muat ulang diam-diam (angka lama tetap tampil, tanpa skeleton),
  // dipakai setelah absen dari popup Dashboard.
  const refresh = useCallback(async () => {
    const next = await loadSummary();
    if (isMountedRef.current) setState((previous) => applyResult(previous, next));
  }, []);

  return { ...state, refresh };
}
