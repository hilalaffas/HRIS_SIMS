// src/pages/Dashboard/DashboardKaryawan.jsx
import React, { useState } from 'react';
import AnnouncementSection from './components/AnnouncementSection';
import CalendarCard from './components/CalendarCard';
import HariLiburPanel from './components/HariLiburPanel';
import CutiSummaryCards from './components/CutiSummaryCards';
import './Dashboard.css';

export default function DashboardKaryawan({ user }) {
  const [selectedDate, setSelectedDate] = useState({
    day: 22,
    month: 5,
    year: 2026,
    isCurrentMonth: true,
    isToday: true,
    agenda: "Meeting Evaluasi Kuartal II - Jam 10:00"
  });

  const [holidaysThisMonth, setHolidaysThisMonth] = useState([]);

  const cutiSummary = {
    sisaCutiTahunan: user?.sisa_cuti_tahunan ?? 8,
    berlakuHingga: '31 Des 2026',
  };

  return (
    <div className="dashboard">

      {/* Kolom Kiri: Card Sisa Cuti + Pengumuman */}
      <div className="dashboard__announcements">
        <CutiSummaryCards
          sisaCutiTahunan={cutiSummary.sisaCutiTahunan}
          berlakuHingga={cutiSummary.berlakuHingga}
        />

        <h2 className="dashboard__section-title">PENGUMUMAN &amp; PORTAL BERITA</h2>
        <AnnouncementSection />
      </div>

      {/* Kolom Kanan: Kalender Kerja + Hari Libur Bulan Ini */}
      <div className="dashboard__sidebar">
        <h2 className="dashboard__section-title">KALENDER KERJA</h2>
        <CalendarCard
          selectedDate={selectedDate}
          onDateClick={setSelectedDate}
          onHolidaysChange={setHolidaysThisMonth}
        />
        <HariLiburPanel holidays={holidaysThisMonth} />
      </div>
    </div>
  );
}