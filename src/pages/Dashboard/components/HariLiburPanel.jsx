// src/pages/Dashboard/components/HariLiburPanel.jsx
import React from 'react';

/**
 * Menampilkan daftar hari libur nasional bulan yang sedang aktif di kalender.
 * Data `holidays` didapat dari callback onHolidaysChange milik CalendarCard,
 * supaya otomatis ikut berubah saat user geser bulan (prev/next).
 *
 * Bentuk tiap item holidays: { day, month, year, agenda }
 */
export default function HariLiburPanel({ holidays = [] }) {
  const formatDate = (h) => {
    const mm = String(h.month + 1).padStart(2, '0');
    const dd = String(h.day).padStart(2, '0');
    return `${h.year}-${mm}-${dd}`;
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <h4 className="font-bold text-sm text-gray-800 pb-3 border-b border-gray-100">
        Hari Libur Bulan Ini
      </h4>

      {holidays.length > 0 ? (
        <div className="flex flex-col divide-y divide-gray-100">
          {holidays.map((h, idx) => (
            <div key={idx} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-sm text-gray-800">{h.agenda}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(h)}</p>
              </div>
              <span className="text-[10px] font-bold bg-red-50 text-red-500 px-2.5 py-1 rounded-full shrink-0">
                NASIONAL
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic pt-3">
          Tidak ada hari libur nasional bulan ini.
        </p>
      )}
    </div>
  );
}