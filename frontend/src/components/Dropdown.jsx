import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Dropdown.css';

/**
 * Dropdown.jsx
 * ------------------------------------------------------------------
 * [BARU] Komponen dropdown custom, pengganti <select> native di seluruh
 * aplikasi. Dibuat karena warna highlight opsi pada <select> native
 * (biru, dikontrol OS/browser) TIDAK BISA diubah lewat CSS di Chrome/
 * Edge (option:hover / option:checked tidak berefek pada background
 * listbox native). Dengan komponen ini, listbox dirender sendiri lewat
 * React sehingga warna hover/selected 100% bisa diatur lewat CSS --
 * dipakai warna hijau global (--color-success dari tokens.css) supaya
 * konsisten di semua halaman.
 *
 * Props:
 * - name        : string, dipakai sebagai `name` pada synthetic event
 *                 onChange (lihat di bawah).
 * - value       : nilai yang sedang terpilih.
 * - onChange    : (event) => void. Dipanggil dengan bentuk event yang
 *                 MIRIP event <select> native: { target: { name, value } }
 *                 -- supaya kompatibel langsung dengan handler
 *                 handleInputChange(e) yang sudah dipakai di banyak
 *                 form tanpa perlu diubah.
 * - options     : array of { value, label, disabled?, className? }. `className`
 *                 opsional dipakai kalau satu opsi butuh style beda (mis. teks
 *                 hijau untuk "Aktif", merah untuk "Nonaktif").
 * - placeholder : teks yang tampil saat belum ada opsi yang cocok
 *                 dengan `value` (pengganti <option value="" disabled>).
 * - disabled    : disable seluruh dropdown.
 * - required    : sama seperti <select required> -- tetap memblokir
 *                 submit form native (lihat hidden native <select> di
 *                 bawah), walau tampilannya sudah custom.
 * - variant     : 'form' (default, lebar penuh, dipakai di dalam form)
 *                 | 'pill' (compact & rounded, dipakai untuk filter/list).
 * - className   : class tambahan opsional (mis. untuk atur width).
 * - id / ariaLabel
 */
const Dropdown = ({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Pilih...',
  disabled = false,
  required = false,
  variant = 'form',
  className = '',
  id,
  ariaLabel,
  title,
  searchable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);
  const hiddenSelectRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    if (!searchable || !normalizedQuery) return options;
    return options.filter((opt) => opt.label.toLocaleLowerCase('id-ID').includes(normalizedQuery));
  }, [options, query, searchable]);

  const selectedIndex = filteredOptions.findIndex(
    (opt) => String(opt.value) === String(value)
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Tutup menu saat klik di luar komponen.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // [BARU] Sinkronkan validitas native <select> tersembunyi supaya atribut
  // `required` tetap memblokir submit form (native), walau tampilan
  // dropdown-nya sudah custom. Class `.dropdown--invalid` dipakai untuk
  // kasih border merah setelah percobaan submit gagal.
  useEffect(() => {
    const hiddenEl = hiddenSelectRef.current;
    if (!hiddenEl) return undefined;
    const handleInvalid = () => {
      wrapperRef.current?.classList.add('dropdown--invalid');
    };
    hiddenEl.addEventListener('invalid', handleInvalid);
    return () => hiddenEl.removeEventListener('invalid', handleInvalid);
  }, [required]);

  const emitChange = (nextValue) => {
    wrapperRef.current?.classList.remove('dropdown--invalid');
    onChange?.({ target: { name, value: nextValue } });
  };

  const openMenu = () => {
    if (disabled) return;
    setQuery('');
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const closeMenu = () => setOpen(false);

  const moveHighlight = (step) => {
    if (!filteredOptions.length) return;
    let next = highlightedIndex;
    for (let i = 0; i < filteredOptions.length; i += 1) {
      next = (next + step + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[next]?.disabled) break;
    }
    setHighlightedIndex(next);
  };

  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openMenu();
      } else {
        moveHighlight(e.key === 'ArrowDown' ? 1 : -1);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) {
        const opt = filteredOptions[highlightedIndex];
        if (opt && !opt.disabled) {
          emitChange(opt.value);
          closeMenu();
        }
      } else {
        openMenu();
      }
    } else if (e.key === 'Escape') {
      closeMenu();
    }
  };

  return (
    <div
      className={`dropdown dropdown--${variant} ${disabled ? 'is-disabled' : ''} ${className}`}
      ref={wrapperRef}
    >
      <button
        type="button"
        id={id}
        className={`dropdown__trigger ${open ? 'is-open' : ''}`}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={title}
      >
        <span className={`dropdown__value ${!selectedOption ? 'is-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className="dropdown__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !disabled && (
        <ul className="dropdown__menu" role="listbox">
          {searchable && (
            <li className="dropdown__search-wrap">
              <input
                autoFocus
                type="search"
                className="dropdown__search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHighlightedIndex(0); }}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Cari..."
                aria-label="Cari pilihan"
              />
            </li>
          )}
          {filteredOptions.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  className={`dropdown__option ${opt.className || ''} ${isSelected ? 'is-selected' : ''} ${idx === highlightedIndex ? 'is-highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => {
                    if (opt.disabled) return;
                    emitChange(opt.value);
                    closeMenu();
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
          {filteredOptions.length === 0 && (
            <li className="dropdown__empty">Data tidak ditemukan.</li>
          )}
        </ul>
      )}

      {/* [BARU] Native <select> tersembunyi -- HANYA untuk menjaga validasi
          HTML5 `required` tetap berfungsi saat form di-submit (browser akan
          tetap memblokir submit + munculkan validation bubble kalau kosong).
          Tidak terlihat & tidak bisa difokus lewat Tab. */}
      {required && (
        <select
          ref={hiddenSelectRef}
          className="dropdown__hidden-native"
          tabIndex={-1}
          aria-hidden="true"
          value={selectedOption ? selectedOption.value : ''}
          required
          onChange={() => {}}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
};

export default Dropdown;
