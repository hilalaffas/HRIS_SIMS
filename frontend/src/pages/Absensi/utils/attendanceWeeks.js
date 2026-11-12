const keyOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Split a closing period into Monday–Sunday weeks, clipping both boundaries.
export function buildAttendanceWeeks(year, month) {
  const start = new Date(year, month - 1, 21);
  const end = new Date(year, month, 20);
  const weeks = [];
  for (let cursor = start; cursor <= end;) {
    const sunday = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + (7 - cursor.getDay()) % 7);
    const last = sunday > end ? end : sunday;
    weeks.push({ from: keyOf(cursor), to: keyOf(last) });
    cursor = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  }
  return weeks;
}

export function currentAttendanceWeek(weeks, today = new Date()) {
  const key = keyOf(today);
  const found = weeks.findIndex((week) => key >= week.from && key <= week.to);
  if (found >= 0) return found;
  return key < weeks[0]?.from ? 0 : Math.max(0, weeks.length - 1);
}
