// src/pages/PersetujuanIzin/components/VerificationChecklist.jsx
//
// [BARU] Checklist verifikasi surat. Tombol "Setujui" baru aktif setelah semua
// poin dicentang (dikendalikan RequestDetail).
import React from 'react';
import { Check } from 'lucide-react';
import { VERIFICATION_ITEMS } from '../utils/permissionRequest';
import './VerificationChecklist.css';

function VerificationChecklist({ checked, disabled, onToggle }) {
  return (
    <fieldset className="pzn-check" disabled={disabled}>
      <legend className="pzn-section-label">Checklist Verifikasi</legend>
      {VERIFICATION_ITEMS.map((item) => (
        <label key={item.key} className={`pzn-check__row${checked[item.key] ? ' is-checked' : ''}`}>
          <input
            type="checkbox"
            checked={!!checked[item.key]}
            onChange={() => onToggle(item.key)}
          />
          <span className="pzn-check__box" aria-hidden="true">
            <Check />
          </span>
          <span className="pzn-check__text">{item.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default React.memo(VerificationChecklist);
