// src/pages/Dashboard/components/HolidayListPanel.jsx
// Panel "Hari Libur Bulan Ini" untuk HRD (daftar + tombol Edit/Hapus).
// Bentuk tiap item holidays berasal dari CalendarCard (onHolidaysChange):
//   { day, month (0-11), year, agenda, isNational, holidayId }
import React, { memo } from 'react';

// Tabel statis: menghindari new Date().toLocaleDateString() di setiap item
// pada setiap render (Intl formatter cukup mahal bila dipanggil berulang).
const MONTH_SHORT_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function HolidayListPanel({ holidays, onAdd, onEdit, onDelete }) {
  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h4 className="font-bold text-sm text-gray-800">Hari Libur Bulan Ini</h4>
          <p className="text-[11px] text-gray-400 mt-1">{holidays.length} hari libur terjadwal</p>
        </div>
        <span
          className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"
          aria-hidden="true"
        >
          <i className="fa-regular fa-calendar-xmark" />
        </span>
      </div>

      {holidays.length ? (
        <ul className="divide-y divide-gray-100">
          {holidays.map((holiday) => (
            <li
              key={holiday.holidayId ?? `${holiday.year}-${holiday.month}-${holiday.day}`}
              className="flex items-center gap-3 py-3"
            >
              <div className="w-11 h-11 shrink-0 rounded-xl bg-rose-50 text-rose-600 flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase font-bold">{MONTH_SHORT_LABELS[holiday.month]}</span>
                <span className="text-sm font-extrabold leading-4">{holiday.day}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 truncate">{holiday.agenda}</p>
                <span
                  className={`inline-flex mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${holiday.isNational ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-700'}`}
                >
                  {holiday.isNational ? 'Nasional' : 'Libur HRD'}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(holiday)}
                  title="Edit hari libur"
                  aria-label={`Edit ${holiday.agenda}`}
                  className="w-8 h-8 rounded-lg text-gray-500 hover:text-[var(--color-primary)] hover:bg-emerald-50"
                >
                  <i className="fa-solid fa-pen-to-square" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(holiday)}
                  title="Hapus hari libur"
                  aria-label={`Hapus ${holiday.agenda}`}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <i className="fa-regular fa-trash-can" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-6 text-center">
          <p className="text-xs text-gray-400 italic">Belum ada hari libur bulan ini.</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 text-xs font-bold text-[var(--color-primary)] hover:underline"
          >
            + Jadwalkan hari libur
          </button>
        </div>
      )}
    </section>
  );
}

export default memo(HolidayListPanel);
