// src/pages/DevSettings/DevSettings.jsx
//
// [BARU] Halaman pengaturan fitur yang SENGAJA tidak ditautkan di
// menuConfig.js / Sidebar manapun -- cuma bisa diakses dengan mengetik
// URL-nya langsung (lihat routes/AppRoutes.jsx untuk path yang dipakai).
// Tetap di dalam ProtectedRoute + MainLayout, jadi tetap butuh login,
// hanya saja tidak muncul di navigasi.
//
// Saat ini cuma satu flag: splash logo loading screen (lihat
// utils/featureFlags.js + components/LoadingScreen.jsx). Kalau nanti ada
// flag lain, tambahkan baris baru di FEATURES di bawah -- tidak perlu ubah
// struktur halaman.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  isLoadingScreenEnabled,
  setLoadingScreenEnabled,
} from '../../utils/featureFlags';
import './DevSettings.css';

export default function DevSettings() {
  const [loadingScreenOn, setLoadingScreenOn] = useState(isLoadingScreenEnabled());
  const [previewing, setPreviewing] = useState(false);

  const handleToggle = () => {
    const next = !loadingScreenOn;
    setLoadingScreenEnabled(next);
    setLoadingScreenOn(next);
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
              terpengaruh oleh switch ini -- tetap selalu aktif.
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

        {/* [BARU] Akun ini sekarang berperan sebagai SuperAdmin penuh (lihat
            migration V34 & ProtectedRoute.jsx), jadi bisa langsung masuk ke
            halaman-halaman SuperAdmin biasa dari sini -- begitu keluar dari
            /supersecret, Sidebar/Navbar normal langsung muncul lagi seperti
            akun SuperAdmin pada umumnya. */}
        <div className="devsettings-row devsettings-row--nolined">
          <div>
            <p className="devsettings-row__label">Akses SuperAdmin</p>
            <p className="devsettings-row__desc">
              Akun ini juga berperan sebagai SuperAdmin -- buka Dashboard untuk lanjut ke
              halaman Karyawan, Cuti, dll seperti akun SuperAdmin biasa.
            </p>
          </div>
          <Link to="/dashboard" className="devsettings-link-btn">
            Buka Dashboard SuperAdmin
          </Link>
        </div>
      </div>
    </div>
  );
}
