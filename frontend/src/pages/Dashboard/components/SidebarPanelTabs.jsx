// src/pages/Dashboard/components/SidebarPanelTabs.jsx
// Tab pengganti panel di bawah kalender: "Karyawan Cuti" <-> "Hari Libur Bulan Ini".
// Dipisah dari DashboardHR agar file induk tetap ringkas, dan dibungkus memo
// supaya tidak render ulang saat state lain di DashboardHR berubah.
import React, { memo } from 'react';
import { SIDEBAR_PANEL } from '../../../constants/dashboardPanels';

const tabBaseClass = 'rounded-lg px-2 py-2 text-[11px] font-bold transition-colors';

function SidebarPanelTabs({ activePanel, onChange, holidayCount = 0 }) {
  const isLeaves = activePanel === SIDEBAR_PANEL.leaves;
  const isHolidays = activePanel === SIDEBAR_PANEL.holidays;

  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1"
      role="tablist"
      aria-label="Informasi kalender"
    >
      <button
        type="button"
        role="tab"
        aria-selected={isLeaves}
        onClick={() => onChange(SIDEBAR_PANEL.leaves)}
        className={`${tabBaseClass} ${isLeaves ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
      >
        <i className="fa-solid fa-users mr-1.5" aria-hidden="true" /> Karyawan Cuti
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isHolidays}
        onClick={() => onChange(SIDEBAR_PANEL.holidays)}
        className={`${tabBaseClass} ${isHolidays ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
      >
        <i className="fa-regular fa-calendar-xmark mr-1.5" aria-hidden="true" /> Hari Libur Bulan Ini
        {holidayCount > 0 && (
          <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-600">
            {holidayCount}
          </span>
        )}
      </button>
    </div>
  );
}

export default memo(SidebarPanelTabs);
