import React, { useEffect, useRef, useState } from 'react';
import './FilterStatusDropdown.css';

const FilterStatusDropdown = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className="filter-status" ref={wrapperRef}>
      <span className="filter-status__label">Filter Status:</span>

      <button
        type="button"
        className={`filter-status__trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected.label}
        <svg
          className="filter-status__chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul className="filter-status__menu" role="listbox">
          {options.map((opt) => {
            const isSelected = opt.value === selected.value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`filter-status__option ${isSelected ? "is-selected" : ""}`}
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

export default FilterStatusDropdown;