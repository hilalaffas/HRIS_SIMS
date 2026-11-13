// Attendance timestamps are naive WIB wall-clock dates, matching parseLocalDate.
// [UBAH] Formatter dibuat SEKALI (membuat Intl.DateTimeFormat itu mahal; sebelumnya dibuat di setiap pemanggilan).
const WIB_FORMATTER = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
export function jakartaWallClock(now = new Date()) {
  const parts = WIB_FORMATTER.formatToParts(now);
  const part = (name) => Number(parts.find((p) => p.type === name)?.value);
  return new Date(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
}
export const workDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function shiftBounds(date, startTime, endTime) {
  if (!date || !startTime || !endTime) return null;
  const start = new Date(`${date}T${startTime.length === 5 ? `${startTime}:00` : startTime}`);
  const end = new Date(`${date}T${endTime.length === 5 ? `${endTime}:00` : endTime}`);
  if (!Number.isFinite(+start) || !Number.isFinite(+end)) return null;
  const overnight = end <= start;
  if (overnight) end.setDate(end.getDate() + 1);
  return { startsAt: start, endsAt: end, overnight };
}
export function resolveActiveWorkShift(scheduleData, records = [], now = new Date()) {
  const wall = jakartaWallClock(now);
  const today = workDateKey(wall);
  const previousDate = new Date(wall.getFullYear(), wall.getMonth(), wall.getDate() - 1);
  const yesterday = workDateKey(previousDate);
  const blocked = (label, workDate = today) => ({ workDate, label, hoursLabel: label, shiftName: label, canCheckIn: false, blockedLabel: label, requiredWorkHours: 8, checkIn: null, checkOut: null, startsAt: null, endsAt: null });
  if (!scheduleData) return blocked('Jadwal tidak tersedia');
  const shifting = String(scheduleData.divisionType).toUpperCase() === 'SHIFTING';
  const schedules = scheduleData.schedules || [];
  const checkInFor = (date) => records.find((r) => r.attendanceDate === date && r.actionCode === 'MASUK' && r.reasonCode === 'ABSEN' && r.approvalStatus !== 'REJECTED');
  const checkOutFor = (date) => records.find((r) => r.attendanceDate === date && r.actionCode === 'KELUAR');
  let workDate = today;
  let schedule = schedules.find((s) => s.date === today);
  if (shifting && !checkInFor(today)) {
    const previous = schedules.find((s) => s.date === yesterday);
    const bounds = shiftBounds(yesterday, previous?.startTime, previous?.endTime);
    const todayBounds = shiftBounds(today, schedule?.startTime, schedule?.endTime);
    if (bounds?.overnight && !checkOutFor(yesterday)
      && (checkInFor(yesterday) || (wall < bounds.endsAt && (!todayBounds || wall < todayBounds.startsAt)))) {
      workDate = yesterday; schedule = previous;
    }
  }
  const checkIn = checkInFor(workDate) || null;
  const checkOut = checkOutFor(workDate) || null;
  if (shifting && !schedule) return { ...blocked('Jadwal belum dipublikasikan', workDate), checkIn, checkOut };
  if (shifting && !schedule.shiftId && !schedule.shiftName) return { ...blocked('Libur / OFF', workDate), checkIn, checkOut };
  const startTime = shifting ? schedule.startTime : '08:00';
  const endTime = shifting ? schedule.endTime : '17:00';
  const bounds = shiftBounds(workDate, startTime, endTime);
  if (!bounds) return { ...blocked('Jadwal tidak valid', workDate), checkIn, checkOut };
  const hoursLabel = `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
  return {
    workDate, checkIn, checkOut, ...bounds,
    hoursLabel, shiftName: shifting ? schedule.shiftName : 'Shift Normal',
    label: `${shifting ? schedule.shiftName : 'Shift Normal'} (${hoursLabel} WIB)${bounds.overnight ? ' · selesai hari berikutnya' : ''}`,
    requiredWorkHours: shifting ? (bounds.endsAt - bounds.startsAt) / 3600000 : 8,
    canCheckIn: !shifting || wall >= bounds.startsAt,
    blockedLabel: shifting && wall < bounds.startsAt ? `Absen Dibuka ${startTime.slice(0, 5)}` : '',
  };
}
