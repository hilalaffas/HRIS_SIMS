import { useState, useEffect, useMemo } from 'react';
import { getHolidaysByMonth } from '../services/holidayService';

const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function toDateStr(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function WorkCalendar({ cutiDates = [] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [holidayMap, setHolidayMap] = useState(new Map());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;

  useEffect(() => {
    let cancelled = false;
    getHolidaysByMonth(year, month)
      .then((data) => { if (!cancelled) setHolidayMap(new Map(data.map((h) => [h.date, h]))); })
      .catch((err) => console.error('Gagal ambil data holiday:', err));
    return () => { cancelled = true; };
  }, [year, month]);

  const cutiSet = useMemo(() => new Set(cutiDates), [cutiDates]);
  const todayStr = new Date().toISOString().split('T')[0];

  function getCellClass(dateStr) {
    const holiday = holidayMap.get(dateStr);
    if (holiday?.isNational) return 'bg-red-100 text-red-600';
    if (dateStr === todayStr) return 'bg-green-700 text-white';
    if (holiday) return 'bg-amber-100 text-amber-700';
    if (cutiSet.has(dateStr)) return 'bg-green-100 text-green-700';
    return '';
  }

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 2, 1))}>{'<'}</button>
        <span className="font-semibold">{monthNames[month - 1]} {year}</span>
        <button onClick={() => setViewDate(new Date(year, month, 1))}>{'>'}</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {dayNames.map((d, i) => (
          <div key={d} className={i === 0 || i === 6 ? 'text-red-500' : 'text-gray-400'}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`empty-${i}`} />;
          const dateStr = toDateStr(year, month, d);
          const holiday = holidayMap.get(dateStr);
          return (
            <div key={dateStr} title={holiday?.name || ''} className={`rounded py-1 ${getCellClass(dateStr)}`}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-3 text-xs text-gray-500">
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-green-700 mr-1" />Hari Ini</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-green-100 mr-1" />Ada Cuti</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded bg-red-100 mr-1" />Libur</span>
      </div>
    </div>
  );
}