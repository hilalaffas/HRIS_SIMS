export const overtimeTodayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// Menempelkan jendela lembur hari libur ke data jadwal (dipakai Absensi & Dashboard).
// Karyawan Regular tanpa data jadwal tetap mendapat konteks minimal supaya tombol absen lembur bisa terbuka.
export function withHolidayWindow(scheduleData, holidayWindow) {
  if (scheduleData) return { ...scheduleData, holidayWindow };
  return holidayWindow?.regularEmployee ? { divisionType: 'REGULAR', schedules: [], holidayWindow } : null;
}

export function isHolidayOvertimeDate(date, window) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6 || (window?.holidayDates || []).includes(date);
}
export function validateOvertimeDate(date, window) {
  if (!window) return 'Kalender pengajuan lembur belum tersedia. Muat ulang halaman.';
  if (window.regularEmployee && isHolidayOvertimeDate(date, window)) {
    return window.allowedHolidayDates.includes(date) ? '' : 'Lembur hari libur hanya dapat diajukan pada hari kerja terakhir sebelum libur.';
  }
  return date > window.serverDate ? 'Tanggal lembur hari kerja tidak boleh melebihi hari ini.' : '';
}
export function overtimeRangeMinutes(start, end) {
  const parse = (clock) => { const [h,m] = String(clock).split(':').map(Number); return h*60+m; };
  if (!start || !end) return null;
  return parse(end)-parse(start);
}
// The request retains its planned duration. Attendance/report credit is capped
// to the actual overlap, only for the new holiday-attendance flow.
export function creditedOvertimeMinutes(item, row) {
  if (!(item.holidayAttendanceRequired || row?.holidayOvertime)) return item.totalMinutes || 0;
  if (!row?.attendanceCheckInAt || !row?.attendanceCheckOutAt) return 0;
  const start = new Date(`${item.date}T${item.startTime}`);
  const end = new Date(`${item.date}T${item.endTime}`);
  if (end <= start) end.setDate(end.getDate()+1);
  return Math.max(0, Math.floor((Math.min(+end, +row.attendanceCheckOutAt) - Math.max(+start, +row.attendanceCheckInAt))/60000));
}
