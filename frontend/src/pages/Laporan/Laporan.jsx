// src/pages/Laporan/Laporan.jsx
//
// [BARU] Halaman Laporan -- khusus role HRD_ADMIN (dijaga di routes/AppRoutes.jsx
// dan di backend: GET /api/absensi/laporan). Berisi tab menu; tab pertama:
// "Laporan Absen". Tab baru: tambahkan ke config/laporanConfig.js (REPORT_TABS)
// lalu render panelnya di bawah.
import React, { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import LaporanTabMenu, { LaporanTabPanel } from './components/LaporanTabMenu';
import { DEFAULT_REPORT_TAB, REPORT_TABS } from './config/laporanConfig';
import AttendanceReportTab from './tabs/AttendanceReportTab';
import './Laporan.css';

export default function Laporan() {
  const [activeTab, setActiveTab] = useState(DEFAULT_REPORT_TAB);

  return (
    <div className="lpr-page">
      <header className="lpr-header">
        <span className="lpr-header-icon" aria-hidden="true"><ClipboardList /></span>
        <div>
          <h1>Laporan</h1>
          <p>Rekap data SDM untuk kebutuhan HRD. Pilih jenis laporan pada tab di bawah.</p>
        </div>
      </header>

      <LaporanTabMenu tabs={REPORT_TABS} activeKey={activeTab} onChange={setActiveTab} />

      <LaporanTabPanel tabKey="ATTENDANCE" activeKey={activeTab}>
        <AttendanceReportTab />
      </LaporanTabPanel>
    </div>
  );
}
