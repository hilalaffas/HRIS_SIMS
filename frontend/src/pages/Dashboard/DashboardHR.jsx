// src/pages/Dashboard/DashboardHR.jsx
import React, { useState } from 'react';
import AnnouncementSection from './components/AnnouncementSection';
import CalendarCard from './components/CalendarCard';
import HariLiburPanel from './components/HariLiburPanel';
import AnnouncementModal from './components/AnnouncementModal';
import HolidayModal from './components/HolidayModal';
import {
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../services/announcementService';
import {
  addHoliday,
  updateHoliday,
  deleteHoliday,
} from '../../services/holidayService';
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

  // Item yang sedang diedit. null berarti modal dalam mode "Tambah".
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editingHoliday, setEditingHoliday] = useState(null);

  // ----- Pengumuman (masih localStorage, backend belum ada) -----

  const handleOpenAddAnnouncement = () => {
    setEditingAnnouncement(null);
    setIsAnnouncementModalOpen(true);
  };

  const handleOpenEditAnnouncement = (item) => {
    setEditingAnnouncement(item);
    setIsAnnouncementModalOpen(true);
  };

  const handleCloseAnnouncementModal = () => {
    setIsAnnouncementModalOpen(false);
    setEditingAnnouncement(null);
  };

  const handleSubmitAnnouncement = async ({ judul, label, isi }) => {
    if (editingAnnouncement) {
      await updateAnnouncement(editingAnnouncement.id, { judul, label, isi });
    } else {
      await addAnnouncement({
        judul,
        label,
        isi,
        author: user?.name || 'HRD',
      });
    }
    setAnnouncementRefreshKey((k) => k + 1);
  };

  const handleDeleteAnnouncement = async (id) => {
    const confirmed = window.confirm('Yakin ingin menghapus pengumuman ini?');
    if (!confirmed) return;
    await deleteAnnouncement(id);
    setAnnouncementRefreshKey((k) => k + 1);
  };

  // ----- Hari Libur (sudah tersambung ke backend /api/holidays) -----

  const handleOpenAddHoliday = () => {
    setEditingHoliday(null);
    setIsHolidayModalOpen(true);
  };

  const handleOpenEditHoliday = (item) => {
    // item berasal dari holidaysThisMonth: { day, month, year, agenda, holidayId, isNational }
    const mm = String(item.month + 1).padStart(2, '0');
    const dd = String(item.day).padStart(2, '0');
    setEditingHoliday({
      id: item.holidayId,
      tanggal: `${item.year}-${mm}-${dd}`,
      nama: item.agenda,
      isNational: item.isNational,
    });
    setIsHolidayModalOpen(true);
  };

  const handleCloseHolidayModal = () => {
    setIsHolidayModalOpen(false);
    setEditingHoliday(null);
  };

  const handleSubmitHoliday = async ({ tanggal, nama, isNational }) => {
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, { tanggal, nama, isNational });
      } else {
        await addHoliday({ tanggal, nama, isNational });
      }
      setCalendarRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Gagal menyimpan hari libur.');
    }
  };

  const handleDeleteHoliday = async (item) => {
    if (!item.holidayId) return;
    const confirmed = window.confirm('Yakin ingin menghapus hari libur ini?');
    if (!confirmed) return;
    try {
      await deleteHoliday(item.holidayId);
      setCalendarRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Gagal menghapus hari libur.');
    }
  };

  return (
    <div className="dashboard">

      {/* Kolom Kiri: Pengumuman */}
      <div className="dashboard__announcements">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">PENGUMUMAN &amp; PORTAL BERITA</h2>
          <button type="button" onClick={handleOpenAddAnnouncement} className="dashboard__action-btn">
            <i className="fa-solid fa-plus"></i> Tambah Berita
          </button>
        </div>
        <AnnouncementSection
          key={announcementRefreshKey}
          onEdit={handleOpenEditAnnouncement}
          onDelete={handleDeleteAnnouncement}
        />
      </div>

      {/* Kolom Kanan: Kalender + Hari Libur Bulan Ini */}
      <div className="dashboard__sidebar">
        <div className="dashboard__section-header">
          <h2 className="dashboard__section-title">KALENDER KERJA</h2>
          <button type="button" onClick={handleOpenAddHoliday} className="dashboard__action-btn">
            <i className="fa-solid fa-plus"></i> Tambah Hari Libur
          </button>
        </div>
        <CalendarCard
          selectedDate={selectedDate}
          onDateClick={setSelectedDate}
          onHolidaysChange={setHolidaysThisMonth}
          refreshTrigger={calendarRefreshKey}
        />
        <HariLiburPanel
          holidays={holidaysThisMonth}
          onEdit={handleOpenEditHoliday}
          onDelete={handleDeleteHoliday}
        />
      </div>

      {/* Modal Pengumuman (Tambah / Edit) */}
      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={handleCloseAnnouncementModal}
        onSubmit={handleSubmitAnnouncement}
        initialData={editingAnnouncement}
      />

      {/* Modal Hari Libur (Tambah / Edit) */}
      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={handleCloseHolidayModal}
        onSubmit={handleSubmitHoliday}
        initialData={editingHoliday}
      />
    </div>
  );
}