import React from 'react';
import './HeadlineApproval.css';

/**
 * HeadlineApproval.jsx
 * ------------------------------------------------------------------
 * Sesuai gambar `2_headlineApproval.PNG`.
 * Catatan: card besar "Total Sisa Cuti Tahunan" SENGAJA tidak
 * ditampilkan di sini (dihapus sesuai arahan) — info sisa cuti
 * dipindah ke dalam PerluDiprosesSection (bagianApproval) dengan
 * tampilan yang lebih subtle.
 * ------------------------------------------------------------------
 */
const HeadlineApproval = ({ title, description, actionLabel, onAction }) => {
  return (
    <div className="headline-approval">
      <div className="headline-approval__text">
        <h1 className="headline-approval__title">{title}</h1>
        <p className="headline-approval__desc">{description}</p>
      </div>

      {actionLabel && (
        <button type="button" className="headline-approval__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default HeadlineApproval;
