// src/pages/DevSettings/DevSettings.jsx
//
// [BARU] Halaman pengaturan fitur yang SENGAJA tidak ditautkan di
// menuConfig.js / Sidebar manapun -- cuma bisa diakses dengan mengetik
// URL-nya langsung (lihat routes/AppRoutes.jsx untuk path yang dipakai).
// Tetap di dalam ProtectedRoute + MainLayout, jadi tetap butuh login,
// hanya saja tidak muncul di navigasi.
//
// [UBAH] Akun dev sekarang SELALU diarahkan ke sini begitu login
// (lihat App.jsx -> handleLoginSuccess) dan halaman ini murni panel toggle
// fitur untuk dev -- tombol "Buka Dashboard SuperAdmin" yang sebelumnya ada
// di sini SUDAH DIHAPUS, jadi akun ini tidak lagi punya jalan pintas UI ke
// Dashboard/Karyawan/Cuti dari halaman ini.
//
// [UBAH] Saklar fitur (lihat utils/featureFlags.js): tombol tema terang/gelap di footer
// (components/ThemeToggle.jsx, dipakai layouts/MainLayout.jsx) -- disimpan di SERVER sehingga
// berlaku di semua browser (lihat services/featureFlagService.js).
// [HAPUS] Saklar "Splash Logo Loading Screen" beserta komponennya sudah dihapus.
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom'; // [BARU] tab aktif tersimpan di URL (?tab=...)
import { isThemeToggleEnabled } from '../../utils/featureFlags';
import useFeatureFlag from '../../hooks/useFeatureFlag'; // [BARU]
import { updateFeatureFlag } from '../../services/featureFlagService'; // [BARU]
import PermissionResetSection from './components/PermissionResetSection'; // [BARU]
import EmployeeDataSection from './components/EmployeeDataSection'; // [BARU] import/export karyawan
import LeaveAdjustmentSection from './components/LeaveAdjustmentSection'; // [BARU] penyesuaian cuti
import NikEditorSection from './components/NikEditorSection'; // [BARU] edit NIK manual
import LeaveHistorySection from './components/LeaveHistorySection'; // [BARU] import/export riwayat cuti (ledger)
import { DevTabBar } from './components/DevTabBar'; // [BARU]
import './DevSettings.css';

// [BARU] Tab halaman dev. Tab "features" = isi lama halaman ini (saklar fitur + reset izin/sakit).
const TAB_FEATURES = 'features';
const TAB_EMPLOYEES = 'employees';
// [UBAH] Tab "Cuti & NIK" (dulu menumpuk 3 bagian sekaligus) dipecah menjadi 3 tab sendiri.
const TAB_LEAVE_BALANCE = 'leaveBalance';
const TAB_LEAVE_HISTORY = 'leaveHistory';
const TAB_NIK = 'nik';

const TABS = [
  { id: TAB_FEATURES, label: 'Pengaturan Fitur' },
  { id: TAB_EMPLOYEES, label: 'Data Karyawan' },
  { id: TAB_LEAVE_BALANCE, label: 'Saldo Cuti' },
  { id: TAB_LEAVE_HISTORY, label: 'Riwayat Cuti' },
  { id: TAB_NIK, label: 'NIK' },
];

const VALID_TAB_IDS = TABS.map((tab) => tab.id);

export default function DevSettings() {
  // [UBAH] Tab aktif dibaca dari query ?tab= supaya tetap sama setelah halaman di-refresh.
  // Nilai yang tidak dikenal jatuh ke tab pertama.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = VALID_TAB_IDS.includes(requestedTab) ? requestedTab : TAB_FEATURES;
  const setActiveTab = (tabId) => setSearchParams({ tab: tabId }, { replace: true });
  // [UBAH] Saklar tombol tema terang/gelap sekarang tersimpan di SERVER.
  // Nilai tampilannya dibaca dari cache yang disinkronkan dari server
  // (useFeatureFlag), bukan state lokal, supaya selalu sama dengan server.
  const themeToggleOn = useFeatureFlag(isThemeToggleEnabled);
  const [themeToggleSaving, setThemeToggleSaving] = useState(false);
  const [themeToggleError, setThemeToggleError] = useState('');

  // [UBAH] Menyimpan ke server (PUT /api/feature-flags/themeToggle). Mematikan
  // = tombol tema hilang dari footer SEMUA akun di SEMUA browser (maksimal ~1
  // menit untuk tab yang sudah terbuka) dan tampilan dipaksa terang.
  const handleThemeToggleSwitch = async () => {
    if (themeToggleSaving) return;
    setThemeToggleSaving(true);
    setThemeToggleError('');
    try {
      await updateFeatureFlag('themeToggle', !themeToggleOn);
    } catch (error) {
      setThemeToggleError(error.message || 'Gagal menyimpan pengaturan. Coba lagi.');
    } finally {
      setThemeToggleSaving(false);
    }
  };

  return (
    <div className="devsettings-page">
      <div className="devsettings-card">
        <h1 className="devsettings-title">Pengaturan Fitur</h1>
        <p className="devsettings-subtitle">
          Halaman ini tidak muncul di menu mana pun -- cuma bisa diakses lewat URL ini langsung.
        </p>

        {/* [BARU] Tab */}
        <DevTabBar tabs={TABS} activeId={activeTab} onChange={setActiveTab} label="Bagian panel dev" />

        {activeTab === TAB_FEATURES && (
          <>
            {/* [BARU] Saklar tombol tema terang/gelap */}
            <div className="devsettings-row">
              <div>
                <p className="devsettings-row__label">Tombol Tema Terang/Gelap</p>
                <p className="devsettings-row__desc">
                  Tombol matahari/bulan di footer. Jika dimatikan, tombol hilang untuk semua role dan
                  tampilan kembali ke tema terang. Pengaturan disimpan di server, jadi berlaku untuk
                  semua akun di semua browser dan perangkat (tab yang sudah terbuka menyusul dalam
                  sekitar 1 menit). Pilihan tema yang pernah disimpan user tidak dihapus.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={themeToggleOn}
                aria-label="Tombol tema terang/gelap"
                className={`devsettings-switch ${themeToggleOn ? 'is-on' : ''}`}
                onClick={handleThemeToggleSwitch}
                disabled={themeToggleSaving}
              >
                <span className="devsettings-switch__knob" />
              </button>
            </div>
            {themeToggleError && <p className="devsettings-error">{themeToggleError}</p>}

            {/* [BARU] Reset data izin/sakit untuk uji ulang pengajuan & persetujuan */}
            <PermissionResetSection />
          </>
        )}

        {/* [BARU] Import/export karyawan */}
        {activeTab === TAB_EMPLOYEES && <EmployeeDataSection />}

        {/* [UBAH] Tiap fungsi punya tab sendiri */}
        {activeTab === TAB_LEAVE_BALANCE && <LeaveAdjustmentSection />}
        {activeTab === TAB_LEAVE_HISTORY && <LeaveHistorySection />}
        {activeTab === TAB_NIK && <NikEditorSection />}
      </div>
    </div>
  );
}
