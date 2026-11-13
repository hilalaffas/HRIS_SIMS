export const MAX_SICK_CALENDAR_DAYS = 30;
export const sickTodayWib = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const epoch = (key) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return NaN;
  const value = Date.parse(`${key}T00:00:00Z`);
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === key ? value : NaN;
};
export const calendarDayCount = (from, to) => (epoch(to) - epoch(from)) / 86400000 + 1;
export function calendarEndDate(from, days) {
  const count = Number(days);
  if (!Number.isFinite(epoch(from)) || !Number.isFinite(count) || count <= 0 || count > MAX_SICK_CALENDAR_DAYS) return '';
  return new Date(epoch(from) + (Math.ceil(count) - 1) * 86400000).toISOString().slice(0, 10);
}

export function updateSickRange(current, field, value) {
  if (field === 'days') return { ...current, days: value, endDate: calendarEndDate(current.startDate, value) || current.endDate };
  if (field === 'startDate') {
    const endDate = current.endDate >= value ? current.endDate : calendarEndDate(value, Number(current.days) || 1);
    return { startDate: value, endDate, days: String(calendarDayCount(value, endDate)) };
  }
  return { ...current, endDate: value, days: String(calendarDayCount(current.startDate, value)) };
}
