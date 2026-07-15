// src/pages/Dashboard/DashboardManager.jsx
import React, { useEffect, useState } from 'react';
import AnnouncementSection from './components/AnnouncementSection';
import CalendarCard from './components/CalendarCard';
import HariLiburPanel from './components/HariLiburPanel';
import CutiSummaryCards from './components/CutiSummaryCards';
import { getLeaveBalance } from '../../services/CutiService';
import './Dashboard.css';

export default function DashboardManager({ user }) {
  const [selectedDate, setSelectedDate] = useState({
    day: 22,
    month: 5,
    year: 2026,
    isCurrentMonth: true,
    isToday: true,
    agenda: "Meeting Evaluasi Kuartal II - Jam 10:00"
  });

  const [holidaysThisMonth, setHolidaysThisMonth] = useState([]);
  const [sisaCutiTahunan, setSisaCutiTahunan] = useState(0);

  useEffect(() => {
    getLeaveBalance().then((balance) => setSisaCutiTahunan(balance.remainingAnnualLeave ?? 0)).catch(() => setSisaCutiTahunan(0));
  }, []);

  return (
    <div className="dashboard">

      <div className="dashboard__announcements">
        <CutiSummaryCards
          sisaCutiTahunan={sisaCutiTahunan}
          berlakuHingga={`31 Des ${new Date().getFullYear()}`}
        />

        <h2 className="dashboard__section-title">PENGUMUMAN &amp; PORTAL BERITA</h2>
        <AnnouncementSection />
      </div>

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
