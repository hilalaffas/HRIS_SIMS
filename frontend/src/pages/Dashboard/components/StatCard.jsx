// src/pages/Dashboard/components/StatCard.jsx
import React from 'react';

/**
 * Kartu statistik kecil, dipakai di DashboardHR & DashboardSuperAdmin.
 *
 * Contoh pemakaian:
 * <StatCard title="Total Karyawan" value={42} unit="Orang" icon="fa-solid fa-users" />
 */
export default function StatCard({ title, value, unit, icon, accent = 'emerald' }) {
  const accentMap = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
  };
  const accentClass = accentMap[accent] || accentMap.emerald;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
      {icon && (
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${accentClass}`}>
          <i className={icon}></i>
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-extrabold text-gray-800">{value}</span>
          {unit && <span className="text-xs font-medium text-gray-500">{unit}</span>}
        </div>
      </div>
    </div>
  );
}