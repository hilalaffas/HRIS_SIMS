// src/pages/Dashboard/DashboardManager.jsx
import React, { useEffect, useState } from 'react';
import AnnouncementSection from './components/AnnouncementSection';
import CalendarCard from './components/CalendarCard';
import KaryawanCutiPanel from './components/KaryawanCutiPanel';
import CutiSummaryCards from './components/CutiSummaryCards';
import { getLeaveBalance } from '../../services/CutiService';
import './Dashboard.css';
import { formatSelectedDayLabel } from '../../utils/dateUtils'; // [BARU] label judul panel "Cuti Tanggal ..."

export default function DashboardManager({ user }) {
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
  // [UBAH] Simpan seluruh objek balance (bukan cuma remainingAnnualLeave)
  // supaya CutiSummaryCards bisa nampilin Total (Tahunan + Sisa Cuti manual).
  const [leaveBalance, setLeaveBalance] = useState(null);
  // [BARU] Dipakai CutiSummaryCards untuk menampilkan skeleton, bukan "0 Hari"
  // yang menyesatkan, selagi fetch pertama berlangsung.
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  useEffect(() => {
    getLeaveBalance()
      .then(setLeaveBalance)
      .catch(() => setLeaveBalance(null))
      .finally(() => setIsLoadingBalance(false));
  }, []);

  return (
    <div className="dashboard">

      <div className="dashboard__announcements">
        <CutiSummaryCards balance={leaveBalance} isLoading={isLoadingBalance} />

        <h2 className="dashboard__section-title">PENGUMUMAN &amp; PORTAL BERITA</h2>
        <AnnouncementSection />
      </div>

      <div className="dashboard__sidebar">
        <h2 className="dashboard__section-title">KALENDER KERJA</h2>
        <CalendarCard
          selectedDate={selectedDate}
          onDateClick={setSelectedDate}
          onTeamLeavesChange={setTeamLeavesThisMonth}
        />
        <KaryawanCutiPanel leaves={teamLeavesThisMonth} />

        {/* [BARU] Daftar karyawan yang cuti PADA TANGGAL yang diklik di
            kalender -- terpisah dari panel "Bulan Ini" di atas. Sumber
            datanya selectedDate.teamLeaveList, ikut ter-update tiap kali
            CalendarCard memanggil onDateClick (lihat CalendarCard.jsx). */}
        <KaryawanCutiPanel
          title={`Cuti Tanggal ${formatSelectedDayLabel(selectedDate)}`}
          leaves={selectedDate.teamLeaveList || []}
          emptyMessage="Tidak ada karyawan yang cuti pada tanggal ini."
          showDateRange={false}
        />
      </div>
    </div>
  );
}
