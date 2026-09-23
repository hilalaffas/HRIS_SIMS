// src/pages/Dashboard/components/CalendarCard.jsx
import React, { useState, useEffect } from 'react';
import { getHolidaysByMonth } from '../../../services/holidayService';
import { getTeamLeaveByYear } from '../../../services/CutiService';

export default function CalendarCard({ selectedDate, onDateClick, onHolidaysChange, onTeamLeavesChange, refreshTrigger }) {
  const todayObj = new Date();
  const [viewDate, setViewDate] = useState(new Date(todayObj.getFullYear(), todayObj.getMonth(), 1));
  // holidays: map tanggal ('YYYY-MM-DD') -> { name, isNational, id }
  const [holidays, setHolidays] = useState({});
  const [teamLeaves, setTeamLeaves] = useState({});
  // [BARU] Daftar cuti tim setahun penuh, satu entri per pengajuan (bukan
  // per-hari) -- sumber untuk currentMonthTeamLeaves di bawah, dipakai
  // KaryawanCutiPanel. Lihat getTeamLeaveByYear di CutiService.js.
  const [teamLeaveList, setTeamLeaveList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-indexed (JS)

  // Ambil data hari libur bulan aktif dari backend, & cuti tim setahun
  useEffect(() => {
    const loadCalendarData = async () => {
      setIsLoading(true);
      try {
        // [UBAH] { silent: true } -- widget sekunder di Dashboard (bukan
        // konten utama halaman), jadi polling 30 detiknya tidak boleh
        // memicu LoadingScreen global. Lihat services/api.js.
        const [holidayList, teamLeaveData] = await Promise.all([
          getHolidaysByMonth(currentYear, currentMonth + 1, { silent: true }), // backend 1-indexed (LocalDate Java)
          getTeamLeaveByYear(currentYear, { silent: true }),
        ]);

        const holidayMap = {};
        (holidayList || []).forEach((h) => {
          // h.date dari backend berbentuk 'YYYY-MM-DD' (LocalDate diserialisasi Jackson)
          holidayMap[h.date] = {
            name: h.name,
            isNational: !!h.isNational,
            id: h.holidayId,
          };
        });

        setHolidays(holidayMap);
        // [UBAH] getTeamLeaveByYear sekarang balikin { byDate, list }.
        setTeamLeaves(teamLeaveData?.byDate || {});
        setTeamLeaveList(teamLeaveData?.list || []);
      } catch (err) {
        console.error('Gagal memuat data kalender:', err);
        setHolidays({});
      } finally {
        setIsLoading(false);
      }
    };
    loadCalendarData();
    const refreshTimer = window.setInterval(loadCalendarData, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [currentYear, currentMonth, refreshTrigger]);

  // [UBAH] Functional update (pakai nilai viewDate sebelumnya dari React,
  // bukan currentYear/currentMonth dari closure render ini). Sebelumnya kalau
  // tombol next/prev diklik cepat (dobel klik sebelum re-render selesai),
  // kedua klik membaca currentMonth yang sama persis -> hanya maju/mundur 1
  // bulan padahal diklik 2x, terasa seperti "stuck". Functional update ini
  // selalu baca state ter-update, jadi tiap klik pasti diproses.
  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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
        isNational: false,
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
      const dateObject = new Date(currentYear, currentMonth, i);
      const isWeekend = dateObject.getDay() === 0 || dateObject.getDay() === 6;
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
        isNational: holidayInfo?.isNational || false,
        holidayId: holidayInfo?.id || null,
        isTeamLeave: teamLeaveList.length > 0 && !holidayInfo && !isWeekend,
        teamLeaveList: !holidayInfo && !isWeekend ? teamLeaveList : [],
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
        isNational: false,
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

  // [BARU] Filter+urutkan cuti tim yang rentangnya beririsan dengan bulan
  // aktif (bukan cuma yang mulai di bulan ini -- cuti yang menyambung dari
  // bulan lalu/ke bulan depan tetap ikut terhitung). Dipakai KaryawanCutiPanel.
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const currentMonthTeamLeaves = teamLeaveList
    .filter((item) => {
      const start = new Date(`${item.startDate}T00:00:00`);
      const end = new Date(`${item.endDate}T00:00:00`);
      return start <= monthEnd && end >= monthStart;
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // [UBAH] Lapor daftar libur & daftar cuti tim bulan yang sedang ditampilkan
  // ke komponen luar. onHolidaysChange masih dipakai untuk mewarnai kalender;
  // onTeamLeavesChange (BARU) menggantikan peran HariLiburPanel lama --
  // sekarang mengisi KaryawanCutiPanel.
  useEffect(() => {
    if (onHolidaysChange) {
      onHolidaysChange(currentMonthHolidays);
    }
    if (onTeamLeavesChange) {
      onTeamLeavesChange(currentMonthTeamLeaves);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holidays, teamLeaveList, currentMonth, currentYear]);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between ">
      
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
              colorClass = 'bg-[var(--color-primary)] text-white font-bold shadow-md scale-105 cursor-pointer';
            } else if (item.isToday) {
              colorClass = 'bg-emerald-100 text-[var(--color-primary)] font-bold border border-[var(--color-primary)] cursor-pointer';
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
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]"></span> Hari Ini
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
