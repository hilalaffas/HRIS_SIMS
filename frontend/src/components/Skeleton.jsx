// src/components/Skeleton.jsx
//
// [BARU] Primitif skeleton loading (shimmer) yang dipakai ulang di semua
// halaman (Karyawan, Cuti, Profile, Dashboard) supaya bentuknya konsisten
// dan tidak ada duplikasi CSS animasi shimmer di tiap file.
//
// Cara pakai:
//   <Skeleton />                          -> garis teks, lebar penuh, tinggi 12px
//   <Skeleton width="60%" />               -> garis teks custom lebar
//   <Skeleton variant="circle" size={44} /> -> lingkaran (avatar)
//   <Skeleton variant="block" height={80} /> -> kotak (kartu, gambar, dll)
//   <Skeleton variant="pill" width={70} height={20} /> -> badge/status pill
//
// SENGAJA tidak dibuat versi "SkeletonTableRow" atau semacamnya yang generik
// -- tiap tabel/kartu punya bentuk kolom sendiri-sendiri, jadi disusun manual
// pakai primitif ini di tiap halaman (lihat TableKaryawan.jsx, RiwayatCuti.jsx,
// dll) supaya betul-betul mengikuti layout aslinya, bukan bentuk generik.
import React from 'react';
import './Skeleton.css';

export default function Skeleton({
  variant = 'line',
  width,
  height,
  size, // shortcut untuk width & height yang sama, dipakai variant="circle"
  className = '',
  style = {},
}) {
  const resolvedWidth = variant === 'circle' ? (size ?? width ?? 40) : width;
  const resolvedHeight = variant === 'circle' ? (size ?? height ?? 40) : height;

  return (
    <span
      className={`skeleton skeleton--${variant} ${className}`.trim()}
      style={{ width: resolvedWidth, height: resolvedHeight, ...style }}
      aria-hidden="true"
    />
  );
}
