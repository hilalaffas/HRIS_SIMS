// src/pages/Karyawan/utils/scheduleGenerator.js
// Logika murni (tanpa React) untuk membuat preview jadwal kerja bulanan
// di ScheduleBuilder.jsx.
//
// ATURAN HARI KERJA (asumsi -- ubah di WORK_WEEKDAYS bila kebijakan beda):
//  - Shift Normal (kode NORMAL) : Senin-Jumat, Sabtu & Minggu OFF
//  - Shift 1 / Shift 2          : Senin-Sabtu,  hanya Minggu OFF
// Tanggal yang ada di tabel hari libur (nasional maupun custom) selalu OFF.

export const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

// getDay(): 0 = Minggu ... 6 = Sabtu
const WORK_WEEKDAYS = {
  NORMAL: [1, 2, 3, 4, 5],
  DEFAULT: [1, 2, 3, 4, 5, 6],
};

const pad = (n) => String(n).padStart(2, '0');

export const toDateKey = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;

// "Shift 1 (Pagi)" -> "Shift 1"; dipakai sebagai label ringkas di sel tabel.
export const shortShiftName = (name = '') => name.replace(/\s*\(.*\)\s*$/, '').trim();

export const workDaysLabel = (shiftCode) =>
  (WORK_WEEKDAYS[shiftCode] || WORK_WEEKDAYS.DEFAULT).length === 5 ? 'Sen–Jum' : 'Sen–Sab';

// Label opsi dropdown "Pola Shift", contoh:
// "Shift Normal (Office) – Sen–Jum, 08:00–17:00"
export const shiftPatternLabel = (shift) =>
  `${shift.name} – ${workDaysLabel(shift.code)}, ${shift.startTime}–${shift.endTime}`;

// Default "YYYY-MM" = bulan depan (jadwal umumnya disusun sebelum bulan berjalan).
export const getNextMonthValue = (now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/**
 * @param {object}   p
 * @param {Array}    p.employees   [{ employeeId, fullName }]
 * @param {string}   p.monthValue  "YYYY-MM"
 * @param {object}   p.shift       { shiftId, code, ... }
 * @param {Set}      p.holidayKeys Set "YYYY-MM-DD" hari libur
 * @returns {{ days: Array, rows: Array }}
 */
export const generateMonthSchedule = ({ employees, monthValue, shift, holidayKeys = new Set() }) => {
  const [year, month] = monthValue.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const workWeekdays = WORK_WEEKDAYS[shift.code] || WORK_WEEKDAYS.DEFAULT;

  const days = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = toDateKey(year, month, day);
    const weekday = new Date(year, month - 1, day).getDay();
    const isHoliday = holidayKeys.has(key);
    const isOff = isHoliday || !workWeekdays.includes(weekday);
    days.push({
      key,
      label: `${day} ${MONTH_SHORT[month - 1]}`,
      isOff,
      // Header hanya menandai "(LIBUR)" untuk hari yang OFF.
      headerLabel: isOff ? `${day} ${MONTH_SHORT[month - 1]} (LIBUR)` : `${day} ${MONTH_SHORT[month - 1]}`,
    });
  }

  const rows = employees.map((emp) => ({
    employeeId: emp.employeeId,
    name: emp.fullName,
    cells: days.map((d) => ({ date: d.key, shiftId: d.isOff ? null : shift.shiftId })),
  }));

  return { year, month, days, rows };
};

// Ratakan ke payload POST /api/jadwal/publish
export const flattenScheduleEntries = (rows) =>
  rows.flatMap((row) =>
    row.cells.map((cell) => ({ employeeId: row.employeeId, date: cell.date, shiftId: cell.shiftId }))
  );
