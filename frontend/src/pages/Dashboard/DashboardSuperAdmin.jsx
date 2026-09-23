// src/pages/Dashboard/DashboardSuperAdmin.jsx
import React, { useState } from 'react';
import AnnouncementSection from './components/AnnouncementSection';
import CalendarCard from './components/CalendarCard';
import KaryawanCutiPanel from './components/KaryawanCutiPanel';
import AnnouncementModal from './components/AnnouncementModal';
import HolidayModal from './components/HolidayModal';
import {
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../services/announcementService';
import { addHoliday } from '../../services/holidayService';
import './Dashboard.css';

export default function DashboardSuperAdmin({ user }) {
  const [selectedDate, setSelectedDate] = useState({
    day: 22,
    month: 5,
    year: 2026,
    isCurrentMonth: true,
    isToday: true,
    agenda: "Meeting Evaluasi Kuartal II - Jam 10:00"
  });

  // [UBAH] holidaysThisMonth diganti teamLeavesThisMonth -- panel "Hari Libur
  // Bulan Ini" digantikan "Karyawan Cuti Bulan Ini" (highlight libur di
  // kotak kalender sendiri tidak berubah, itu internal CalendarCard).
  const [teamLeavesThisMonth, setTeamLeavesThisMonth] = useState([]);

  const [announcementRefreshKey, setAnnouncementRefreshKey] = useState(0);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // Item yang sedang diedit. null berarti modal dalam mode "Tambah".
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

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

  const handleSubmitAnnouncement = async ({ judul, label, isi, publishAt, expiresAt }) => {
    if (editingAnnouncement) {
      await updateAnnouncement(editingAnnouncement.id, { judul, label, isi, publishAt, expiresAt });
    } else {
      await addAnnouncement({
        judul,
        label,
        isi,
        publishAt,
        expiresAt,
        author: user?.name || 'Super Admin',
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
  // [UBAH] handleOpenEditHoliday & handleDeleteHoliday DIHAPUS -- satu-
  // satunya pemicu keduanya adalah tombol Edit/Hapus di HariLiburPanel, dan
  // panel itu sudah digantikan KaryawanCutiPanel. "Tambah Hari Libur" di
  // atas kalender tetap ada & berfungsi seperti biasa.

  const handleOpenAddHoliday = () => {
    setIsHolidayModalOpen(true);
  };

  const handleCloseHolidayModal = () => {
    setIsHolidayModalOpen(false);
  };

  const handleSubmitHoliday = async ({ tanggal, nama, isNational }) => {
    try {
      await addHoliday({ tanggal, nama, isNational });
      setCalendarRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Gagal menyimpan hari libur.');
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
          mode="admin"
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
          onTeamLeavesChange={setTeamLeavesThisMonth}
          refreshTrigger={calendarRefreshKey}
        />
        <KaryawanCutiPanel leaves={teamLeavesThisMonth} />
      </div>

      {/* Modal Pengumuman (Tambah / Edit) */}
      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={handleCloseAnnouncementModal}
        onSubmit={handleSubmitAnnouncement}
        initialData={editingAnnouncement}
      />

      {/* Modal Hari Libur (Tambah) */}
      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={handleCloseHolidayModal}
        onSubmit={handleSubmitHoliday}
      />
    </div>
  );
}