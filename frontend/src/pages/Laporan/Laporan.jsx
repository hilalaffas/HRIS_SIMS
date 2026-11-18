// src/pages/Laporan/Laporan.jsx
//
// [BARU] Halaman Laporan -- dibuka untuk HRD_ADMIN & SUPER_ADMIN (dijaga di routes/AppRoutes.jsx
// dan di backend). Tab yang tampil mengikuti role (lihat getVisibleReportTabs di
// config/laporanConfig.js): Laporan Absen (HRD_ADMIN saja) dan Ringkasan Cuti.
// [UBAH] Tab Histori Cuti dihapus; ekspor Excel format ledger pindah ke tab Ringkasan Cuti.
// Tab baru: tambahkan ke config/laporanConfig.js (REPORT_TABS) lalu render panelnya di bawah.
import React, { useMemo, useState } from 'react';
import LaporanTabMenu, { LaporanTabPanel } from './components/LaporanTabMenu';
import { getVisibleReportTabs } from './config/laporanConfig';
import AttendanceReportTab from './tabs/AttendanceReportTab';
import LeaveSummaryReportTab from './tabs/LeaveSummaryReportTab';
import './Laporan.css';

export default function Laporan({ user }) {
  const visibleTabs = useMemo(() => getVisibleReportTabs(user), [user]);
  const [activeTab, setActiveTab] = useState(() => visibleTabs[0]?.key);

  return (
    <div className="lpr-page">
      {/* [UBAH] Header halaman (ikon + judul "Laporan" + deskripsi) dihapus: tab menu langsung di atas. */}
      <LaporanTabMenu tabs={visibleTabs} activeKey={activeTab} onChange={setActiveTab} />

      {/* Panel hanya dirender untuk tab yang boleh dilihat role ini (LaporanTabPanel menampilkan
          panel hanya bila tabKey sama dengan activeKey, dan activeKey selalu dari visibleTabs). */}
      <LaporanTabPanel tabKey="ATTENDANCE" activeKey={activeTab}>
        <AttendanceReportTab />
      </LaporanTabPanel>
      <LaporanTabPanel tabKey="LEAVE_SUMMARY" activeKey={activeTab}>
        <LeaveSummaryReportTab />
      </LaporanTabPanel>
    </div>
  );
}
