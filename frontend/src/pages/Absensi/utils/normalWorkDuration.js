const MAX_NORMAL_MINUTES = 8 * 60;

function clockOnDate(dateKey, clock) {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(clock || '')) return null;
  const date = new Date(`${dateKey}T${clock.length === 5 ? `${clock}:00` : clock}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Count only time inside the scheduled shift, capped at eight hours.
// Dates use the same local wall-clock representation as attendance records.
export function normalWorkMinutes(checkIn, checkOut, dateKey, schedule) {
  if (!checkIn || !checkOut) return null;
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime())) return null;

  const shiftStart = clockOnDate(dateKey, schedule?.startTime || '08:00');
  const shiftEnd = clockOnDate(dateKey, schedule?.endTime || '17:00');
  if (shiftStart && shiftEnd && shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

  const start = Math.max(checkIn.getTime(), shiftStart?.getTime() ?? checkIn.getTime());
  const end = Math.min(checkOut.getTime(), shiftEnd?.getTime() ?? checkOut.getTime());
  return Math.min(MAX_NORMAL_MINUTES, Math.max(0, (end - start) / 60000));
}
