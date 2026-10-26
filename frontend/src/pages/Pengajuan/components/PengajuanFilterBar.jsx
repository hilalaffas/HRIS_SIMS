// src/pages/Pengajuan/components/PengajuanFilterBar.jsx
//
// Baris filter di atas tabel riwayat: dropdown Jenis, dropdown Status, dan
// kolom cari. Komponen terkontrol -- state filter dipegang parent (Pengajuan.jsx).
//
// Contoh pemakaian:
// <PengajuanFilterBar kind={kind} status={status} search={search}
//   onKindChange={setKind} onStatusChange={setStatus} onSearchChange={setSearch} />
import React from 'react';
import { Filter, Search, SlidersHorizontal } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import { KIND_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from '../utils/pengajuanItems';
import './PengajuanFilterBar.css';

export default function PengajuanFilterBar({ kind, status, search, onKindChange, onStatusChange, onSearchChange }) {
  return (
    <section className="pgj-filter-bar" aria-label="Filter riwayat pengajuan">
      <div className="pgj-filter-group">
        <span className="pgj-filter-icon" aria-hidden="true"><Filter /></span>
        <Dropdown
          value={kind}
          onChange={(event) => onKindChange(event.target.value)}
          options={KIND_FILTER_OPTIONS}
          variant="pill"
          className="pgj-filter-select pgj-filter-select--kind"
          ariaLabel="Filter jenis pengajuan"
        />
        <span className="pgj-filter-icon" aria-hidden="true"><SlidersHorizontal /></span>
        <Dropdown
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          options={STATUS_FILTER_OPTIONS}
          variant="pill"
          className="pgj-filter-select pgj-filter-select--status"
          ariaLabel="Filter status pengajuan"
        />
      </div>

      <label className="pgj-search">
        <Search aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Cari riwayat pengajuan..."
          aria-label="Cari riwayat pengajuan"
        />
      </label>
    </section>
  );
}
