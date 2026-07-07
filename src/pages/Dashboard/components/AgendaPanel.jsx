// src/pages/Dashboard/components/AgendaPanel.jsx
import React from 'react';

export default function AgendaPanel({ selectedDate }) {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 min-h-30 justify-center">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <h4 className="font-bold text-xs text-gray-700 tracking-wide">
          Agenda Tanggal {selectedDate.day} {monthNames[selectedDate.month]} {selectedDate.year}
        </h4>
        {selectedDate.isToday && (
          <span className="bg-blue-50 text-blue-600 font-bold text-[9px] px-1.5 py-0.5 rounded">HARI INI</span>
        )}
        {selectedDate.isHoliday && (
          <span className="bg-red-50 text-red-500 font-bold text-[9px] px-1.5 py-0.5 rounded">LIBUR</span>
        )}
      </div>
      
      <p className="text-xs text-gray-500 leading-relaxed">
        {selectedDate.agenda ? selectedDate.agenda : "Tidak ada agenda khusus atau jadwal koordinasi tim pada tanggal ini."}
      </p>
    </div>
  );
}