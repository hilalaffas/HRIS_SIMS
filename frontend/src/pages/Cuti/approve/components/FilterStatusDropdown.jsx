// src/pages/Cuti/approve/components/FilterStatusDropdown.jsx
//
// [UBAH] Filter status List Cuti / List Lembur / List Koreksi. Dulu punya dropdown sendiri dengan
// warna dari variabel lokal (--alv-* / --kry-*) sehingga latar menunya bisa tampak transparan dan
// berbeda dari dropdown lain. Sekarang memakai komponen bersama <Dropdown variant="pill"> (token
// global tokens.css: latar solid, hover/terpilih hijau, tema gelap otomatis) -- SAMA dengan filter
// di Pengajuan, Laporan, dan jumlah data per halaman.
//
// Props tidak berubah: value, onChange(value), options [{ value, label }].
//
// Contoh pemakaian:
// <FilterStatusDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
import React from 'react';
import Dropdown from '../../../../components/Dropdown';
import './FilterStatusDropdown.css';

const FilterStatusDropdown = ({ value, onChange, options }) => (
  <div className="filter-status">
    <span className="filter-status__label">Filter Status:</span>
    <Dropdown
      variant="pill"
      className="filter-status__dropdown"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={options}
      ariaLabel="Filter status"
    />
  </div>
);

export default FilterStatusDropdown;
