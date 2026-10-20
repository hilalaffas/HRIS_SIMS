// src/components/RouteFallback.jsx
// [BARU] Ditampilkan sebentar saat chunk halaman (lazy) sedang diunduh.
// Garis tipis bergerak di atas area konten; baru muncul setelah 150ms supaya
// tidak berkedip kalau chunk sudah ada di cache.
import React from 'react';
import './RouteFallback.css';

export default function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-label="Memuat halaman">
      <span className="route-fallback__bar" />
    </div>
  );
}
