// src/pages/Dashboard/components/HariLiburPanel.jsx
import React from 'react';

/**
 * Menampilkan daftar hari libur bulan yang sedang aktif di kalender.
 * Data `holidays` didapat dari callback onHolidaysChange milik CalendarCard.
 *
 * Bentuk tiap item holidays: { day, month, year, agenda, isNational, holidayId }
 *
 * Tombol Edit/Hapus tampil untuk SEMUA hari libur (nasional maupun tambahan),
 * sesuai kebijakan: backend mengizinkan HR/Admin mengubah/menghapus hari libur
 * apa pun lewat /api/holidays. Badge NASIONAL/TAMBAHAN di sini murni informasi,
 * bukan pembatas hak akses.
 */
export default function HariLiburPanel({ holidays = [], onEdit, onDelete }) {
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
            <div key={idx} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{h.agenda}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(h)}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    h.isNational ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {h.isNational ? 'NASIONAL' : 'TAMBAHAN'}
                </span>
              </div>

              {(onEdit || onDelete) && (
                <div className="flex items-center gap-3 mt-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(h)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1"
                    >
                      <i className="fa-solid fa-pen"></i> Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(h)}
                      className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      <i className="fa-solid fa-trash"></i> Hapus
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic pt-3">
          Tidak ada hari libur bulan ini.
        </p>
      )}
    </div>
  );
}