import React from 'react';
import './DivisiTypeToggle.css';

// Nilai tipe sama persis dengan yang disimpan backend (kolom divisi.tipe_divisi).
export const DIVISI_TYPE_LABEL = {
  REGULAR: 'Regular',
  SHIFTING: 'Non Regular (Shifting)',
};

// Toggle 2 pilihan: Regular / Non Regular (Shifting).
// Dipakai di form "Tambah" dan modal "Edit Divisi" (DataDivisi.jsx).
const DivisiTypeToggle = ({ value, onChange, disabled = false, fullWidth = false }) => (
  <div
    className={`toggle_divisi_type${fullWidth ? ' toggle_divisi_type--full' : ''}`}
    role="group"
    aria-label="Tipe divisi"
  >
    <button
      type="button"
      disabled={disabled}
      className={value === 'REGULAR' ? 'selected' : ''}
      onClick={() => onChange('REGULAR')}
    >
      Regular
    </button>
    <button
      type="button"
      disabled={disabled}
      className={value === 'SHIFTING' ? 'selected shifting' : ''}
      onClick={() => onChange('SHIFTING')}
    >
      Non Regular <span>(Shifting)</span>
    </button>
  </div>
);

export default DivisiTypeToggle;
