// src/pages/DevSettings/components/DevLoadingOverlay.jsx
//
// [BARU] Layar loading penuh saat file CSV sedang diimpor / diekspor: animasi "buku membalik
// halaman" + pesan. Dipakai CsvImportPanel dan CsvExportButton supaya pengguna tidak
// mengklik apa pun (dan tidak menutup halaman) sebelum proses selesai.
//
// Contoh pemakaian: {isBusy && <DevLoadingOverlay message="Mengimpor data karyawan..." />}
import React from 'react';
import './DevLoadingOverlay.css';

const PAGE_PATH =
  'M90,0 L90,120 L11,120 C4.92,120 0,115.08 0,109 L0,11 C0,4.92 4.92,0 11,0 L90,0 Z '
  + 'M71.5,81 L18.5,81 C17.12,81 16,82.12 16,83.5 C16,84.88 17.12,86 18.5,86 L71.5,86 '
  + 'C72.88,86 74,84.88 74,83.5 C74,82.12 72.88,81 71.5,81 Z '
  + 'M71.5,57 L18.5,57 C17.12,57 16,58.12 16,59.5 C16,60.88 17.12,62 18.5,62 L71.5,62 '
  + 'C72.88,62 74,60.88 74,59.5 C74,58.12 72.88,57 71.5,57 Z '
  + 'M71.5,33 L18.5,33 C17.12,33 16,34.12 16,35.5 C16,36.88 17.12,38 18.5,38 L71.5,38 '
  + 'C72.88,38 74,36.88 74,35.5 C74,34.12 72.88,33 71.5,33 Z';

const PAGE_COUNT = 5;

export default function DevLoadingOverlay({ message = 'Memproses...' }) {
  return (
    <div className="devloader-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="devloader">
        <div>
          <ul>
            {Array.from({ length: PAGE_COUNT }, (_, index) => (
              <li key={index}>
                <svg fill="currentColor" viewBox="0 0 90 120" aria-hidden="true">
                  <path d={PAGE_PATH} />
                </svg>
              </li>
            ))}
          </ul>
        </div>
        <span>{message}</span>
      </div>
      <p className="devloader-note">Jangan tutup halaman ini sampai proses selesai.</p>
    </div>
  );
}
