const STATUS_TONES = { 'TANPA KETERANGAN': 'alpha', TERLAMBAT: 'telat', 'HADIR TEPAT WAKTU': 'hadir' };
export const REPORT_STATUS_OPTIONS = [
  { value: 'TANPA KETERANGAN', label: 'Tanpa Keterangan (Alpha)' },
  { value: 'TERLAMBAT', label: 'Terlambat' },
  { value: 'HADIR TEPAT WAKTU', label: 'Hadir Tepat Waktu' },
];
export const reportTodayWib = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);
const keyOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function attachReportEdits(rows, employee, now = new Date()) {
  const today = reportTodayWib(now);
  const historyByDate = new Map();
  (employee.revisions || []).forEach((revision) => {
    const history = historyByDate.get(revision.date) || [];
    history.push(revision); historyByDate.set(revision.date, history);
  });
  historyByDate.forEach((history) => history.sort((a, b) => b.id - a.id));
  const protectedDates = new Set();
  (employee.attendances || []).forEach((record) => {
    if (!record.attendanceDate || record.approvalStatus === 'REJECTED' || !['SAKIT', 'IZIN'].includes(record.reason)) return;
    if (record.sickStartDate && record.sickEndDate) {
      for (const cursor = new Date(`${record.sickStartDate}T00:00:00`); keyOf(cursor) <= record.sickEndDate; cursor.setDate(cursor.getDate() + 1)) protectedDates.add(keyOf(cursor));
      return;
    }
    const date = new Date(`${record.attendanceDate}T00:00:00`);
    let remaining = record.reason === 'SAKIT' ? Math.max(1, Math.ceil(Number(record.leaveDays) || 1)) : 1;
    protectedDates.add(record.attendanceDate);
    while (remaining > 1) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) { protectedDates.add(keyOf(date)); remaining--; }
    }
  });
  const shifting = String(employee.divisionType).toUpperCase() === 'SHIFTING';
  const schedules = new Map((employee.schedules || []).map((schedule) => [schedule.date, schedule]));
  return rows.map((row) => {
    const future = row.date > today;
    const protectedStatus = protectedDates.has(row.date) || ['sakit', 'izin', 'leave', 'cuti', 'menunggu'].includes(row.tone)
      || (employee.leaves || []).some((leave) => row.date >= leave.startDate && row.date <= leave.endDate);
    const history = historyByDate.get(row.date) || [];
    const latest = history.find((revision) => !revision.scheduleChange);
    const corrected = { ...row };
    if (latest && !future) {
      if (!protectedStatus && STATUS_TONES[latest.afterStatus]) {
        corrected.status = latest.afterStatus; corrected.tone = STATUS_TONES[latest.afterStatus];
        corrected.lateMinutes = 0;
        if (corrected.tone === 'telat' && row.checkInEvidence?.recordedAt) {
          const time = schedules.get(row.date)?.startTime || '08:00:00';
          const start = new Date(`${row.date}T${time.length === 5 ? `${time}:00` : time}`);
          corrected.lateMinutes = Math.max(0, Math.floor((row.checkInEvidence.recordedAt - start) / 60000));
        }
      }
      corrected.note = latest.afterNote ?? row.note;
      corrected.noteDetail = corrected.note;
    }
    const shiftOptions = (employee.shiftOptions || []).filter((option, index, all) => (option.date == null || option.date === row.date) && option.shiftId != null
      && all.findIndex((other) => (other.date == null || other.date === row.date) && other.shiftId === option.shiftId) === index);
    const canEditShift = future && shifting && schedules.has(row.date) && shiftOptions.length > 0;
    const joined = !employee.joinDate || row.date >= employee.joinDate;
    return {
      ...corrected, history, revisionId: history[0]?.id ?? null,
      canEdit: joined && (!future || canEditShift),
      canEditShift: joined && canEditShift,
      canEditStatus: joined && !future && !protectedStatus,
      canEditNote: joined && !future,
      shiftId: schedules.get(row.date)?.shiftId ?? null, shiftOptions,
    };
  });
}
