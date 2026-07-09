// src/pages/Dashboard/components/CalendarCard.jsx
import React, { useState, useEffect } from 'react';
import { getHolidaysByYear } from '../../../services/holidayService';
import { getTeamLeaveByYear } from '../../../services/cutiService';
import { getCustomHolidaysRawByYear } from '../../../services/holidayCustomService';

export default function CalendarCard({ selectedDate, onDateClick, onHolidaysChange, refreshTrigger }) {
  const todayObj = new Date();
  const [viewDate, setViewDate] = useState(new Date(todayObj.getFullYear(), todayObj.getMonth(), 1));
  // holidays: map tanggal -> { name, isCustom, id }
  const [holidays, setHolidays] = useState({});
  const [teamLeaves, setTeamLeaves] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Ambil data libur nasional (bawaan), libur custom (dari HR/Admin), & cuti tim
  useEffect(() => {
    const loadCalendarData = async () => {
      setIsLoading(true);
      const [officialHolidays, customHolidayList, teamLeaveData] = await Promise.all([
        getHolidaysByYear(currentYear),
        getCustomHolidaysRawByYear(currentYear),
        getTeamLeaveByYear(currentYear),
      ]);

      // Gabungkan libur nasional bawaan + libur custom (custom menimpa jika tanggal sama),
      // sambil menyimpan id & sumber datanya supaya panel Hari Libur tahu item mana
      // yang boleh di-Edit/Hapus.
      const holidayMap = {};
      Object.entries(officialHolidays || {}).forEach(([dateKey, name]) => {
        holidayMap[dateKey] = { name, isCustom: false, id: null };
      });
      (customHolidayList || []).forEach((item) => {
        holidayMap[item.tanggal] = { name: item.nama, isCustom: true, id: item.id };
      });

      setHolidays(holidayMap);
      setTeamLeaves(teamLeaveData || {});
      setIsLoading(false);
    };
    loadCalendarData();
  }, [currentYear, refreshTrigger]);

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Generator kotak tanggal kalender (42 Kotak)
  const generateCalendarDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const daysArray = [];

    // 1. Ekor bulan lalu (Abu-abu)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      daysArray.push({
        day: totalDaysPrevMonth - i,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
        isCurrentMonth: false,
        isToday: false,
        isHoliday: false,
        isCustomHoliday: false,
        holidayId: null,
        isTeamLeave: false,
        teamLeaveList: [],
        agenda: ""
      });
    }

    // 2. Bulan aktif saat ini
    for (let i = 1; i <= totalDays; i++) {
      const formattedMonth = String(currentMonth + 1).padStart(2, '0');
      const formattedDay = String(i).padStart(2, '0');
      const dateKey = `${currentYear}-${formattedMonth}-${formattedDay}`;

      const holidayInfo = holidays[dateKey];
      const teamLeaveList = teamLeaves[dateKey] || [];
      const isToday = i === todayObj.getDate() && 
                      currentMonth === todayObj.getMonth() && 
                      currentYear === todayObj.getFullYear();

      daysArray.push({
        day: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        isToday: isToday,
        isHoliday: !!holidayInfo,
        isCustomHoliday: holidayInfo?.isCustom || false,
        holidayId: holidayInfo?.id || null,
        isTeamLeave: teamLeaveList.length > 0,
        teamLeaveList,
        agenda: holidayInfo?.name || ""
      });
    }

    // 3. Ekor bulan berikutnya (Abu-abu)
    const remainingCells = 42 - daysArray.length;
    for (let i = 1; i <= remainingCells; i++) {
      daysArray.push({
        day: i,
        month: currentMonth === 11 ? 0 : currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
        isCurrentMonth: false,
        isToday: false,
        isHoliday: false,
        isCustomHoliday: false,
        holidayId: null,
        isTeamLeave: false,
        teamLeaveList: [],
        agenda: ""
      });
    }

    return daysArray;
  };

  const days = generateCalendarDays();

  // Filter hari libur khusus bulan aktif
  const currentMonthHolidays = days.filter(d => d.isCurrentMonth && d.isHoliday);

  // Lapor daftar libur bulan yang sedang ditampilkan ke komponen luar (HariLiburPanel)
  useEffect(() => {
    if (onHolidaysChange) {
      onHolidaysChange(currentMonthHolidays);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holidays, currentMonth, currentYear]);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full relative">
      
      {isLoading && (
        <span className="absolute top-6 right-24 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full animate-pulse">
          Menyinkronkan...
        </span>
      )}

      <div>
        {/* Header Navigasi */}
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-sm text-gray-800">
            {monthNames[currentMonth]} {currentYear}
          </h4>
          <div className="flex gap-1">
            <button type="button" onClick={handlePrevMonth} className="p-1 px-2 border border-gray-200 rounded-md text-xs hover:bg-gray-50 text-gray-600 font-bold cursor-pointer">&lt;</button>
            <button type="button" onClick={handleNextMonth} className="p-1 px-2 border border-gray-200 rounded-md text-xs hover:bg-gray-50 text-gray-600 font-bold cursor-pointer">&gt;</button>
          </div>
        </div>

        {/* Nama Hari */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400 mb-2">
          <div className="text-red-500">Min</div>
          <div>Sen</div>
          <div>Sel</div>
          <div>Rab</div>
          <div>Kam</div>
          <div>Jum</div>
          <div className="text-red-500">Sab</div>
        </div>

        {/* Grid Angka Kalender */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
          {days.map((item, index) => {
            const itemDate = new Date(item.year, item.month, item.day);
            const isSunday = item.isCurrentMonth && itemDate.getDay() === 0;
            const isSaturday = item.isCurrentMonth && itemDate.getDay() === 6;
            const isWeekend = isSunday || isSaturday;
            
            const isSelected = selectedDate && 
                               selectedDate.day === item.day && 
                               selectedDate.month === item.month && 
                               selectedDate.year === item.year;

            const teamLeaveNames = item.teamLeaveList.map(t => t.nama).join(', ');
            const tooltipParts = [];
            if (item.agenda) tooltipParts.push(item.agenda);
            if (teamLeaveNames) tooltipParts.push(`Cuti: ${teamLeaveNames}`);
            if (isWeekend && tooltipParts.length === 0) {
              tooltipParts.push(isSunday ? 'Hari Minggu' : 'Hari Sabtu');
            }

            let colorClass;
            if (!item.isCurrentMonth) {
              colorClass = 'text-gray-200 bg-transparent cursor-default';
            } else if (isSelected) {
              colorClass = 'bg-[#2A6B4F] text-white font-bold shadow-md scale-105 cursor-pointer';
            } else if (item.isToday) {
              colorClass = 'bg-emerald-100 text-[#2A6B4F] font-bold border border-[#2A6B4F] cursor-pointer';
            } else if (item.isHoliday) {
              colorClass = 'bg-red-50 text-red-600 font-semibold hover:bg-red-100 cursor-pointer';
            } else if (item.isTeamLeave) {
              colorClass = 'bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 cursor-pointer';
            } else if (isWeekend) {
              colorClass = 'text-red-500 font-semibold hover:bg-red-50 cursor-pointer';
            } else {
              colorClass = 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer';
            }

            return (
              <button
                key={index}
                type="button"
                disabled={!item.isCurrentMonth}
                onClick={() => onDateClick(item)}
                title={tooltipParts.join(' | ')}
                className={`p-2 rounded-lg flex items-center justify-center h-8 w-8 mx-auto transition-all outline-none ${colorClass}`}
              >
                {item.day}
              </button>
            );
          })}
        </div>

        {/* Legend Warna */}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2A6B4F]"></span> Hari Ini
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100"></span> Ada Cuti
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-100"></span> Libur
          </span>
        </div>
      </div>

    </div>
  );
}