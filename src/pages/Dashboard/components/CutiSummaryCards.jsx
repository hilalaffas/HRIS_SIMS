// src/pages/Dashboard/components/CutiSummaryCards.jsx
import React from 'react';
import './CutiSummaryCards.css';

/**
 * Card ringkasan sisa cuti tahunan.
 * Angka diterima lewat props supaya nanti tinggal diisi dari API/database.
 *
 * Contoh pemakaian:
 * <CutiSummaryCards sisaCutiTahunan={8} berlakuHingga="31 Des 2026" />
 */
export default function CutiSummaryCards({
  sisaCutiTahunan = 0,
  berlakuHingga = '-',
}) {
  return (
    <div className="cuti-card cuti-card--dark">
      <span className="cuti-card__label">TOTAL SISA CUTI TAHUNAN</span>

      <div className="cuti-card__value">
        <span className="cuti-card__number">{sisaCutiTahunan}</span>
        <span className="cuti-card__unit">Hari</span>
      </div>

      <span className="cuti-card__note">
        Dapat digunakan hingga {berlakuHingga}
      </span>

      {/* Ikon kalender dekoratif */}
      <i className="fa-regular fa-calendar cuti-card__icon" aria-hidden="true"></i>
    </div>
  );
}