// src/pages/PersetujuanIzin/components/ApprovalToolbar.jsx
//
// [BARU] Filter jenis pengajuan (select) + pencarian nama karyawan.
import React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { TYPE_FILTER_OPTIONS } from '../utils/permissionRequest';
import './ApprovalToolbar.css';

function ApprovalToolbar({ type, query, onTypeChange, onQueryChange }) {
  return (
    <div className="pzn-toolbar">
      <label className="pzn-select">
        <span className="pzn-visually-hidden">Filter jenis pengajuan</span>
        <select value={type} onChange={(event) => onTypeChange(event.target.value)}>
          {TYPE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" />
      </label>

      <label className="pzn-search">
        <Search aria-hidden="true" />
        <span className="pzn-visually-hidden">Cari nama karyawan</span>
        <input
          type="search"
          value={query}
          placeholder="Cari nama karyawan..."
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
    </div>
  );
}

export default React.memo(ApprovalToolbar);
