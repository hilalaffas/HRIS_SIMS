// src/utils/regularSchedule.js
//
// [BARU] Jam kerja divisi REGULAR: jam dasar + jadwal khusus per hari (Senin-Jumat).
// Satu sumber untuk halaman Absensi, Laporan, dan form Kelola Divisi (fungsi murni, tanpa React).
//
// Bentuk data (sama dengan backend RegularScheduleResponse):
//   { startTime: '08:00', endTime: '17:00',
//     dayRules: [{ dayOfWeek: 5, startTime, breakStartTime, breakEndTime, endTime }] }   // 1 = Senin ... 5 = Jumat
//
// Contoh:
//   resolveRegularDay(schedule, '2026-09-25') // Jumat -> { startTime: '08:00', endTime: '17:30', requiredMinutes: 480, ... }
//   formatRegularLabel(day)                   // 'Shift Normal (08:00 - 17:30)'

export const DEFAULT_REGULAR_SCHEDULE = { startTime: '08:00', endTime: '17:00', dayRules: [] };

export const REGULAR_PRESETS = [
  { key: 'PRESET_0800', label: '08:00 – 17:00', startTime: '08:00', endTime: '17:00' },
  { key: 'PRESET_0900', label: '09:00 – 18:00', startTime: '09:00', endTime: '18:00' },
];
export const CUSTOM_PRESET_KEY = 'CUSTOM';

export const WEEKDAYS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
];

const STANDARD_WORK_MINUTES = 8 * 60;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidClock = (value) => TIME_PATTERN.test(String(value || ''));
export const clockToMinutes = (clock) => {
  const [hour, minute] = String(clock).slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
};

// Menerima respons backend (atau null) -> bentuk lengkap yang aman dipakai.
export function normalizeRegularSchedule(raw) {
  if (!raw) return DEFAULT_REGULAR_SCHEDULE;
  return {
    startTime: String(raw.startTime || DEFAULT_REGULAR_SCHEDULE.startTime).slice(0, 5),
    endTime: String(raw.endTime || DEFAULT_REGULAR_SCHEDULE.endTime).slice(0, 5),
    dayRules: (raw.dayRules || []).map((rule) => ({
      dayOfWeek: Number(rule.dayOfWeek),
      startTime: String(rule.startTime).slice(0, 5),
      breakStartTime: String(rule.breakStartTime).slice(0, 5),
      breakEndTime: String(rule.breakEndTime).slice(0, 5),
      endTime: String(rule.endTime).slice(0, 5),
    })),
  };
}

// Data divisi dari GET /api/divisi -> bentuk jadwal reguler.
export const divisionToRegularSchedule = (division) => normalizeRegularSchedule({
  startTime: division?.regularStartTime,
  endTime: division?.regularEndTime,
  dayRules: division?.daySchedules,
});

// Lama kerja bersih: dengan istirahat = rentang - istirahat; tanpa istirahat = maksimal 8 jam
// (aturan sama dengan WorkHours.java di backend).
export function requiredMinutesOf({ startTime, endTime, breakStartTime, breakEndTime }) {
  const span = clockToMinutes(endTime) - clockToMinutes(startTime);
  if (breakStartTime && breakEndTime) return span - (clockToMinutes(breakEndTime) - clockToMinutes(breakStartTime));
  return Math.min(STANDARD_WORK_MINUTES, span);
}

const dayOfWeekOf = (dateKey) => {
  const day = new Date(`${dateKey}T00:00:00`).getDay(); // 0 = Minggu
  return day === 0 ? 7 : day;
};

// Jam kerja pada tanggal tertentu. Akhir pekan memakai jam dasar (isOff: true) -- pemanggil yang
// perlu tahu hari kerja memeriksa isOff; jadwal khusus hanya berlaku Senin-Jumat.
export function resolveRegularDay(schedule, dateKey) {
  const base = normalizeRegularSchedule(schedule);
  const dayOfWeek = dayOfWeekOf(dateKey);
  const rule = base.dayRules.find((item) => item.dayOfWeek === dayOfWeek);
  const hours = rule
    ? { startTime: rule.startTime, endTime: rule.endTime, breakStartTime: rule.breakStartTime, breakEndTime: rule.breakEndTime }
    : { startTime: base.startTime, endTime: base.endTime, breakStartTime: null, breakEndTime: null };
  return { ...hours, requiredMinutes: requiredMinutesOf(hours), isCustomDay: Boolean(rule), isOff: dayOfWeek > 5 };
}

export const formatRegularHours = (day) => `${day.startTime} - ${day.endTime}`;
export const formatRegularLabel = (day) => `Shift Normal (${formatRegularHours(day)})`;

// Istirahat dalam menit untuk kolom laporan; null = tidak ada istirahat eksplisit.
export const breakMinutesOf = (day) => (day.breakStartTime && day.breakEndTime
  ? clockToMinutes(day.breakEndTime) - clockToMinutes(day.breakStartTime) : null);

// Pesan error (bahasa Indonesia) atau '' bila jadwal valid. Aturan sama dengan DivisiService.java.
export function validateRegularSchedule(schedule) {
  if (!isValidClock(schedule.startTime) || !isValidClock(schedule.endTime)) return 'Jam masuk dan jam pulang wajib diisi.';
  if (clockToMinutes(schedule.startTime) >= clockToMinutes(schedule.endTime)) return 'Jam pulang harus lebih besar dari jam masuk.';
  const usedDays = new Set();
  for (const rule of schedule.dayRules) {
    const dayName = WEEKDAYS.find((day) => day.value === rule.dayOfWeek)?.label || 'Hari';
    if (usedDays.has(rule.dayOfWeek)) return `${dayName} memiliki lebih dari satu jadwal khusus.`;
    usedDays.add(rule.dayOfWeek);
    const times = [rule.startTime, rule.breakStartTime, rule.breakEndTime, rule.endTime];
    if (!times.every(isValidClock)) return `Jadwal khusus ${dayName}: semua jam wajib diisi.`;
    const [start, breakStart, breakEnd, end] = times.map(clockToMinutes);
    if (!(start < breakStart && breakStart < breakEnd && breakEnd < end)) {
      return `Jadwal khusus ${dayName}: urutan jam harus masuk, istirahat mulai, istirahat selesai, pulang.`;
    }
  }
  return '';
}

// ---- Pengelompokan untuk editor: hari dengan jam identik digabung jadi satu kartu ----
const ruleSignature = (rule) => [rule.startTime, rule.breakStartTime, rule.breakEndTime, rule.endTime].join('|');

export function groupDayRules(dayRules) {
  const groups = new Map();
  dayRules.forEach((rule) => {
    const key = ruleSignature(rule);
    const group = groups.get(key) || { days: [], startTime: rule.startTime, breakStartTime: rule.breakStartTime, breakEndTime: rule.breakEndTime, endTime: rule.endTime };
    group.days.push(rule.dayOfWeek);
    groups.set(key, group);
  });
  return [...groups.values()];
}

// Kartu editor -> baris per hari (urut hari). Hari yang sama di dua kartu tetap dikirim dua kali
// supaya validasi (server & validateRegularSchedule) menolaknya, bukan diam-diam menimpa.
export const expandRuleGroups = (groups) => groups
  .flatMap((group) => group.days.map((dayOfWeek) => ({
    dayOfWeek, startTime: group.startTime, breakStartTime: group.breakStartTime, breakEndTime: group.breakEndTime, endTime: group.endTime,
  })))
  .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

export function detectPresetKey(schedule) {
  const preset = REGULAR_PRESETS.find((item) => item.startTime === schedule.startTime && item.endTime === schedule.endTime);
  return preset ? preset.key : CUSTOM_PRESET_KEY;
}
