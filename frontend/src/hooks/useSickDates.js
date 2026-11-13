import { useState } from 'react';
import { calendarDayCount, updateSickRange, MAX_SICK_CALENDAR_DAYS, sickTodayWib } from '../utils/sickDates';

export default function useSickDates({ earlyCheckout = false, initialRange } = {}) {
  const [range, setRange] = useState(() => initialRange || ({ startDate: sickTodayWib(), endDate: sickTodayWib(), days: '1' }));
  const changeDays = (days) => setRange((current) => updateSickRange(current, 'days', days));
  const changeStartDate = (date) => setRange((current) => updateSickRange(current, 'startDate', date));
  const changeEndDate = (date) => setRange((current) => updateSickRange(current, 'endDate', date));
  const resetDates = () => setRange({ startDate: sickTodayWib(), endDate: sickTodayWib(), days: '1' });
  const lockToday = () => setRange((current) => ({ startDate: sickTodayWib(), endDate: sickTodayWib(), days: earlyCheckout ? current.days : '1' }));
  const validateDates = () => {
    const days = Number(range.days);
    if (earlyCheckout) return [0.5, 1].includes(days) ? '' : 'Lama izin sakit pulang cepat harus 0,5 atau 1 hari.';
    if (!Number.isInteger(days) || days < 1 || days > MAX_SICK_CALENDAR_DAYS)
      return `Lama izin sakit harus 1 sampai ${MAX_SICK_CALENDAR_DAYS} hari kalender.`;
    if (!range.startDate || !range.endDate || calendarDayCount(range.startDate, range.endDate) !== days)
      return 'Tanggal dan lama izin sakit tidak sesuai.';
    return '';
  };
  return { ...range, changeDays, changeStartDate, changeEndDate, lockToday, resetDates, validateDates };
}
