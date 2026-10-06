// src/pages/DevSettings/DevSettings.jsx
//
// [BARU] Halaman pengaturan fitur yang SENGAJA tidak ditautkan di
// menuConfig.js / Sidebar manapun -- cuma bisa diakses dengan mengetik
// URL-nya langsung (lihat routes/AppRoutes.jsx untuk path yang dipakai).
// Tetap di dalam ProtectedRoute + MainLayout, jadi tetap butuh login,
// hanya saja tidak muncul di navigasi.
//
// [UBAH] Akun 'supersecret' sekarang SELALU diarahkan ke sini begitu login
// (lihat App.jsx -> handleLoginSuccess) dan halaman ini murni panel toggle
// fitur untuk dev -- tombol "Buka Dashboard SuperAdmin" yang sebelumnya ada
// di sini SUDAH DIHAPUS, jadi akun ini tidak lagi punya jalan pintas UI ke
// Dashboard/Karyawan/Cuti dari halaman ini.
//
// [UBAH] Sekarang ada dua flag (lihat utils/featureFlags.js):
//   1. splash logo loading screen (components/LoadingScreen.jsx)
//   2. tombol tema terang/gelap di footer (components/ThemeToggle.jsx,
//      dipakai layouts/MainLayout.jsx) -- disimpan di SERVER sehingga berlaku
//      di semua browser (lihat services/featureFlagService.js)
import React, { useState } from 'react';
import {
  isLoadingScreenEnabled,
  setLoadingScreenEnabled,
  isThemeToggleEnabled,
} from '../../utils/featureFlags';
import useFeatureFlag from '../../hooks/useFeatureFlag'; // [BARU]
import { updateFeatureFlag } from '../../services/featureFlagService'; // [BARU]
import './DevSettings.css';

export default function DevSettings() {
  const [loadingScreenOn, setLoadingScreenOn] = useState(isLoadingScreenEnabled());
  const [previewing, setPreviewing] = useState(false);
  // [UBAH] Saklar tombol tema terang/gelap sekarang tersimpan di SERVER.
  // Nilai tampilannya dibaca dari cache yang disinkronkan dari server
  // (useFeatureFlag), bukan state lokal, supaya selalu sama dengan server.
  const themeToggleOn = useFeatureFlag(isThemeToggleEnabled);
  const [themeToggleSaving, setThemeToggleSaving] = useState(false);
  const [themeToggleError, setThemeToggleError] = useState('');

  const handleToggle = () => {
    const next = !loadingScreenOn;
    setLoadingScreenEnabled(next);
    setLoadingScreenOn(next);
  };

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

  // [BARU] Simulasikan satu siklus loading (tanpa perlu benar-benar fetch
  // apa pun) supaya efeknya langsung kelihatan -- dispatch event yang PERSIS
  // sama dengan yang dipakai services/api.js untuk request GET asli.
  const handlePreview = () => {
    if (previewing) return;
    setPreviewing(true);
    window.dispatchEvent(new CustomEvent('sims:loading-start'));
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sims:loading-end'));
      setPreviewing(false);
    }, 2000);
  };

  return (
    <div className="devsettings-page">
      <div className="devsettings-card">
        <h1 className="devsettings-title">Pengaturan Fitur</h1>
        <p className="devsettings-subtitle">
          Halaman ini tidak muncul di menu mana pun -- cuma bisa diakses lewat URL ini langsung.
        </p>

        <div className="devsettings-row">
          <div>
            <p className="devsettings-row__label">Splash Logo Loading Screen</p>
            <p className="devsettings-row__desc">
              Layar penuh dengan logo &amp; progress bar yang muncul saat data halaman sedang
              dimuat. Skeleton loading di tiap halaman (Karyawan, Cuti, Profile, Dashboard) tidak
              terpengaruh oleh switch ini -- tetap selalu aktif. Pengaturan ini hanya berlaku di
              browser ini.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={loadingScreenOn}
            className={`devsettings-switch ${loadingScreenOn ? 'is-on' : ''}`}
            onClick={handleToggle}
          >
            <span className="devsettings-switch__knob" />
          </button>
        </div>

        <button
          type="button"
          className="devsettings-preview-btn"
          onClick={handlePreview}
          disabled={!loadingScreenOn || previewing}
        >
          {previewing ? 'Menampilkan...' : 'Coba sekarang'}
        </button>
        {!loadingScreenOn && (
          <p className="devsettings-hint">Aktifkan switch di atas dulu untuk mencoba pratinjaunya.</p>
        )}

        {/* [BARU] Saklar tombol tema terang/gelap */}
        <div className="devsettings-row devsettings-row--spaced">
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
      </div>
    </div>
  );
}
