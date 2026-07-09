import React, { useEffect, useRef, useState } from 'react';
import './FilterDepartemenDropdown.css';

/**
 * FilterDepartemenDropdown.jsx
 * ------------------------------------------------------------------
 * Dropdown filter departemen. Mengikuti pola & interaksi yang sama
 * dengan FilterStatusDropdown milik modul ApproveLeave (klik-luar
 * untuk menutup, aria-listbox) supaya UX konsisten se-aplikasi.
 *
 * Props:
 *  - value: departemen yang sedang aktif ('ALL' atau salah satu opsi)
 *  - onChange: (value) => void
 *  - options: array string nama departemen
 * ------------------------------------------------------------------
 */
const FilterDepartemenDropdown = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allOptions = [{ value: 'ALL', label: 'Semua Departemen' }, ...options.map((o) => ({ value: o, label: o }))];
  const selected = allOptions.find((opt) => opt.value === value) || allOptions[0];

  return (
    <div className="filter-departemen" ref={wrapperRef}>
      <button
        type="button"
        className={`filter-departemen__trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected.label}
        <svg className="filter-departemen__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className="filter-departemen__menu" role="listbox">
          {allOptions.map((opt) => {
            const isSelected = opt.value === selected.value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`filter-departemen__option ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FilterDepartemenDropdown;
