// src/pages/Laporan/utils/overtimeAcc.js
//
// [BARU] Hitungan jam lembur ACC untuk laporan absensi (fungsi murni, hanya memakai util murni,
// supaya mudah dites dan dipakai builder laporan).
//
// Aturan pengali (jam yang disetujui, per tanggal):
//   - Hari kerja            : 60 menit pertama x1,5; sisanya x2.
//   - Hari libur / libur shift / jadwal shift belum dipublikasikan : seluruhnya x2.
//
// Contoh pemakaian:
//   calculateOvertimeAccMinutes(90, false); // 60*1.5 + 30*2 = 150
//   calculateOvertimeAccMinutes(60, true);  // 120
//   const rows = applyOvertimeAcc(rows, overtimes, { holidaysByDate, divisionType });
import { creditedOvertimeMinutes } from '../../../utils/holidayOvertime.js';

const FIRST_HOUR_MINUTES = 60;
const WORKDAY_FIRST_HOUR_RATE = 1.5;
const OVERTIME_RATE = 2;

const REST_DAY_SHIFT_LABEL = 'Libur';
const UNPUBLISHED_SHIFT_LABEL = 'Belum dipublikasikan';

export function calculateOvertimeAccMinutes(approvedMinutes, isRestDay) {
  const minutes = Number(approvedMinutes) || 0;
  if (minutes <= 0) return 0;
  if (isRestDay) return minutes * OVERTIME_RATE;
  const firstHourMinutes = Math.min(minutes, FIRST_HOUR_MINUTES);
  const remainingMinutes = minutes - firstHourMinutes;
  return Math.round(firstHourMinutes * WORKDAY_FIRST_HOUR_RATE + remainingMinutes * OVERTIME_RATE);
}

// Total menit lembur berstatus APPROVED per tanggal ('YYYY-MM-DD' -> menit).
export function sumApprovedMinutesByDate(overtimes = [], rows = []) {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const minutesByDate = new Map();
  overtimes.forEach((item) => {
    if (item.statusCode !== 'APPROVED') return;
    minutesByDate.set(item.date, (minutesByDate.get(item.date) || 0) + creditedOvertimeMinutes(item, byDate.get(item.date)));
  });
  return minutesByDate;
}

function isOvertimeRestDay(row, holidaysByDate, isShiftingDivision) {
  if (holidaysByDate?.[row.date] || row.shift === REST_DAY_SHIFT_LABEL) return true;
  return isShiftingDivision && (!row.shift || row.shift === UNPUBLISHED_SHIFT_LABEL);
}

// Mengembalikan baris yang sama dengan tambahan `overtimeAccMinutes` HANYA pada tanggal
// yang punya lembur ACC (baris lain tidak disentuh -> tidak ada alokasi objek sia-sia).
// Bila tidak ada lembur ACC sama sekali, array asli dikembalikan apa adanya.
export function applyOvertimeAcc(rows, overtimes, { holidaysByDate, divisionType } = {}) {
  const approvedMinutesByDate = sumApprovedMinutesByDate(overtimes, rows);
  if (!approvedMinutesByDate.size) return rows;
  // [UBAH] Tanggal lembur hari libur dihitung sekali (sebelumnya overtimes.some() dijalankan untuk setiap baris).
  const holidayAttendanceDates = new Set(overtimes.filter((item) => item.holidayAttendanceRequired).map((item) => item.date));

  const isShiftingDivision = String(divisionType || '').toUpperCase() === 'SHIFTING';
  return rows.map((row) => {
    const approvedMinutes = approvedMinutesByDate.get(row.date);
    if (!approvedMinutes) return row;
    return {
      ...row,
      overtimeAccMinutes: calculateOvertimeAccMinutes(
        approvedMinutes,
        isOvertimeRestDay(row, holidaysByDate, isShiftingDivision) || holidayAttendanceDates.has(row.date),
      ),
    };
  });
}
