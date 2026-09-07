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
  // [UBAH] Simpan seluruh objek balance (bukan cuma remainingAnnualLeave)
  // supaya CutiSummaryCards bisa nampilin Total (Tahunan + Sisa Cuti manual).
  const [leaveBalance, setLeaveBalance] = useState(null);

  useEffect(() => {
    getLeaveBalance().then(setLeaveBalance).catch(() => setLeaveBalance(null));
  }, []);

  return (
    <div className="dashboard">

      <div className="dashboard__announcements">
        <CutiSummaryCards balance={leaveBalance} />

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
