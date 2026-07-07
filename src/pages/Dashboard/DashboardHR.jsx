// src/pages/Dashboard/DashboardHR.jsx
import React, { useState } from 'react';
import AnnouncementSection from './components/AnnouncementSection';
import CalendarCard from './components/CalendarCard';
import HariLiburPanel from './components/HariLiburPanel';
import AnnouncementModal from './components/AnnouncementModal';
import HolidayModal from './components/HolidayModal';
import { addAnnouncement } from '../../services/announcementService';
import { addCustomHoliday } from '../../services/holidayCustomService';
import './Dashboard.css';

export default function DashboardHR({ user }) {
  const [selectedDate, setSelectedDate] = useState({
    day: 22,
    month: 5,
    year: 2026,
    isCurrentMonth: true,
    isToday: true,
    agenda: "Meeting Evaluasi Kuartal II - Jam 10:00"
  });

  const [holidaysThisMonth, setHolidaysThisMonth] = useState([]);

  // Kunci untuk memaksa AnnouncementSection & CalendarCard refresh data setelah submit
  const [announcementRefreshKey, setAnnouncementRefreshKey] = useState(0);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  const handleSubmitAnnouncement = async ({ judul, label, isi }) => {
    await addAnnouncement({
      judul,
      label,
      isi,
      author: user?.name || 'HRD',
    });
    setAnnouncementRefreshKey((k) => k + 1);
  };

  const handleSubmitHoliday = async ({ tanggal, nama }) => {
    await addCustomHoliday({ tanggal, nama });
    setCalendarRefreshKey((k) => k + 1);
  };

  return (
    <div className="dashboard">

      {/* Kolom Kiri: Pengumuman */}
      <div className="dashboard__announcements">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">PENGUMUMAN &amp; PORTAL BERITA</h2>
          <button type="button" onClick={() => setIsAnnouncementModalOpen(true)} className="dashboard__action-btn">
            <i className="fa-solid fa-plus"></i> Tambah Berita
          </button>
        </div>
        <AnnouncementSection key={announcementRefreshKey} />
      </div>

      {/* Kolom Kanan: Kalender + Hari Libur Bulan Ini */}
      <div className="dashboard__sidebar">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">KALENDER KERJA</h2>
          <button type="button" onClick={() => setIsHolidayModalOpen(true)} className="dashboard__action-btn">
            <i className="fa-solid fa-plus"></i> Tambah Hari Libur
          </button>
        </div>
        <CalendarCard
          selectedDate={selectedDate}
          onDateClick={setSelectedDate}
          onHolidaysChange={setHolidaysThisMonth}
          refreshTrigger={calendarRefreshKey}
        />
        <HariLiburPanel holidays={holidaysThisMonth} />
      </div>

      {/* Modal Buat Pengumuman Baru */}
      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSubmit={handleSubmitAnnouncement}
      />

      {/* Modal Jadwalkan Hari Libur */}
      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        onSubmit={handleSubmitHoliday}
      />
    </div>
  );
}