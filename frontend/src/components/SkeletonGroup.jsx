// src/components/SkeletonGroup.jsx
//
// [BARU] Pembungkus loading skeleton untuk SATU blok (tabel / kartu / grafik).
//
// Kenapa dibuat terpisah dari <Skeleton /> per-bentuk:
//   - Kilau (shimmer) dijalankan SATU kali di level grup lewat transform (dikerjakan GPU,
//     tidak memicu repaint), bukan di setiap bentuk. Tabel dengan puluhan bentuk tetap ringan.
//   - Skeleton baru MUNCUL dengan jeda 120 ms (CSS), jadi data yang selesai cepat tidak
//     membuat layar berkedip. Ruangnya tetap dipesan, jadi tidak ada layout shift.
//   - Teks status untuk pembaca layar (aria-busy) disediakan di sini, bentuk-bentuknya aria-hidden.
//
// Cara pakai:
//   <SkeletonGroup label="Memuat histori cuti..." radius={8}>
//     ...susunan <Skeleton /> yang meniru layout aslinya...
//   </SkeletonGroup>
// Isi grup otomatis memakai warna datar (kilau-nya dari grup) -- lihat Skeleton.css.
import React from 'react';
import './Skeleton.css';

export default function SkeletonGroup({ label = 'Memuat data...', radius = 8, className = '', children }) {
  return (
    <div
      className={`skeleton-group ${className}`.trim()}
      style={{ borderRadius: radius }}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="skeleton-sr">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}
