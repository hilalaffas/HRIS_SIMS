// src/pages/Dashboard/hooks/useAttendanceSummary.js
//
// [BARU] Data untuk kartu ringkasan Dashboard: rekap presensi periode
// berjalan (tutup buku tgl 21 - 20), status absen hari ini, dan divisi.
// Memakai ulang buildMonthlyRows() dari modul Absensi supaya angka di
// Dashboard SAMA PERSIS dengan tabel "Jadwal & Log Absensi Bulanan".
import { useEffect, useState } from 'react';
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

  return { todayStatus, checkInTime: isSick ? '' : checkIn?.time || '' };
}

export default function useAttendanceSummary() {
  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        // Profil hanya untuk nama divisi -- kegagalannya tidak boleh menggagalkan rekap.
        const [history, profile] = await Promise.all([
          getMyAttendanceHistory(),
          getMyProfile().catch(() => null),
        ]);
        if (isCancelled) return;

        const now = new Date();
        const records = (history || []).map(toDisplayRecord);
        const { year, month } = getCurrentPeriod(now);
        const rows = buildMonthlyRows(records, year, month, now);
        const periodEnd = new Date(year, month, 1);

        setState({
          isLoading: false,
          hasError: false,
          ...summarizeRows(rows),
          periodShort: periodEnd.toLocaleDateString('id-ID', MONTH_FORMAT),
          periodRange: formatPeriodLabel(year, month),
          ...resolveTodayStatus(records, dateKey(now)),
          division: profile?.divisi && profile.divisi !== '-' ? profile.divisi : '',
        });
      } catch {
        if (!isCancelled) setState({ ...INITIAL_STATE, isLoading: false, hasError: true });
      }
    }

    load();
    return () => { isCancelled = true; };
  }, []);

  return state;
}
