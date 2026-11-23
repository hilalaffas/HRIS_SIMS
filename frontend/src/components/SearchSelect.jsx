import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import './SearchSelect.css';

/**
 * SearchSelect.jsx
 * ------------------------------------------------------------------
 * [BARU] Kolom pilihan dengan PENCARIAN LANGSUNG (autocomplete): pengguna cukup
 * mengetik nama di kolom itu sendiri, daftar yang cocok muncul, lalu pilih dengan
 * Enter (opsi yang di-highlight) atau klik. Dipakai untuk "Dicover Oleh".
 *
 * Kontrak sama dengan <Dropdown>: onChange menerima { target: { name, value } },
 * jadi handler lama (handleInputChange / setCoveredBy(e.target.value)) tidak berubah.
 * Nilai HANYA berubah lewat pemilihan opsi -- teks bebas yang diketik tidak pernah
 * tersimpan, jadi tidak mungkin ada nama yang tidak ada di daftar.
 *
 * Props: name, value, onChange, options [{ value, label, disabled? }], placeholder,
 *        required, disabled, className, id, ariaLabel, emptyText.
 *
 * Keyboard: ArrowUp/Down pindah highlight, Enter pilih (dan TIDAK men-submit form),
 * Escape tutup, Tab tutup. Enter saat mengetik huruf Jepang (IME) tidak dianggap pilih.
 */

// Normalisasi untuk pencarian: tanpa aksen, huruf kecil.
const normalize = (text) => String(text ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const MENU_MAX_HEIGHT = 240;

const SearchSelect = ({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Cari...',
  disabled = false,
  required = false,
  className = '',
  id,
  ariaLabel,
  emptyText = 'Data tidak ditemukan.',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const [openUp, setOpenUp] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const hiddenRef = useRef(null);
  const keyboardNavRef = useRef(false); // scroll-ke-highlight hanya untuk navigasi keyboard
  const listId = useId();

  const selectedOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)) || null,
    [options, value],
  );

  // Semua token yang diketik harus ada di label ("bud san" cocok "Budi Santoso").
  // Yang diawali token pertama diurutkan lebih dulu; urutan asli dipertahankan di dalamnya.
  const filtered = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return options;
    const matches = options.filter((opt) => {
      const label = normalize(opt.label);
      return tokens.every((token) => label.includes(token));
    });
    const startsWith = (opt) => (normalize(opt.label).startsWith(tokens[0]) ? 0 : 1);
    return matches
      .map((opt, index) => ({ opt, index }))
      .sort((a, b) => (startsWith(a.opt) - startsWith(b.opt)) || (a.index - b.index))
      .map(({ opt }) => opt);
  }, [options, query]);

  // Highlight selalu valid walau daftar berubah (mis. data cover baru selesai dimuat).
  useEffect(() => {
    setHighlighted((current) => (current >= filtered.length ? 0 : current));
  }, [filtered.length]);

  // Geser daftar mengikuti highlight -- hanya untuk keyboard (hover mouse tidak boleh menggeser).
  useEffect(() => {
    if (!open || !keyboardNavRef.current) return;
    keyboardNavRef.current = false;
    menuRef.current?.querySelector(`[data-idx="${highlighted}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  // Validasi native `required` (sama seperti <Dropdown required>).
  useEffect(() => {
    const el = hiddenRef.current;
    if (!el) return undefined;
    const onInvalid = () => wrapperRef.current?.classList.add('dropdown--invalid');
    el.addEventListener('invalid', onInvalid);
    return () => el.removeEventListener('invalid', onInvalid);
  }, [required]);

  const openMenu = () => {
    if (disabled) return;
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < MENU_MAX_HEIGHT && rect.top > spaceBelow); // buka ke atas bila bawah sempit
    }
    if (!open) {
      const index = filtered.findIndex((opt) => String(opt.value) === String(value));
      setHighlighted(index >= 0 ? index : 0);
      keyboardNavRef.current = true; // tampilkan opsi terpilih di dalam area terlihat
    }
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setQuery('');
  };

  const choose = (opt) => {
    if (!opt || opt.disabled) return;
    wrapperRef.current?.classList.remove('dropdown--invalid');
    onChange?.({ target: { name, value: opt.value } });
    closeMenu();
  };

  const move = (step) => {
    if (!filtered.length) return;
    let next = highlighted;
    for (let i = 0; i < filtered.length; i += 1) {
      next = (next + step + filtered.length) % filtered.length;
      if (!filtered[next]?.disabled) break;
    }
    keyboardNavRef.current = true;
    setHighlighted(next);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    // Enter yang mengonfirmasi komposisi IME (huruf Jepang) bukan perintah "pilih".
    if (event.nativeEvent?.isComposing || event.keyCode === 229) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { openMenu(); return; }
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter') {
      event.preventDefault(); // jangan men-submit form
      if (!open) { openMenu(); return; }
      choose(filtered[highlighted]);
    } else if (event.key === 'Escape') {
      if (open) { event.preventDefault(); event.stopPropagation(); closeMenu(); } // tidak ikut menutup modal
    } else if (event.key === 'Tab') {
      if (open) closeMenu();
    }
  };

  const handleBlur = (event) => {
    if (wrapperRef.current?.contains(event.relatedTarget)) return;
    closeMenu(); // teks yang belum dipilih dibuang; nilai lama tetap
  };

  const showValueText = !open && selectedOption;

  return (
    <div
      className={`searchselect ${disabled ? 'is-disabled' : ''} ${className}`}
      ref={wrapperRef}
      onBlur={handleBlur}
    >
      <div className={`searchselect__field ${open ? 'is-open' : ''}`}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          className="searchselect__input"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setHighlighted(0); keyboardNavRef.current = false; if (!open) openMenu(); }}
          onFocus={openMenu}
          onClick={() => { if (!open) openMenu(); }}
          onKeyDown={handleKeyDown}
          placeholder={open && selectedOption ? selectedOption.label : placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[highlighted] ? `${listId}-${highlighted}` : undefined}
        />
        {showValueText && (
          <span className="searchselect__value" aria-hidden="true">{selectedOption.label}</span>
        )}
        <button
          type="button"
          tabIndex={-1}
          className={`searchselect__chevron ${open ? 'is-open' : ''}`}
          aria-label="Tampilkan daftar"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { if (open) closeMenu(); else { openMenu(); inputRef.current?.focus(); } }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          ref={menuRef}
          role="listbox"
          className={`searchselect__menu ${openUp ? 'is-up' : ''}`}
          onMouseDown={(event) => event.preventDefault()} // fokus tetap di kolom (klik opsi / drag scrollbar)
        >
          {filtered.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  tabIndex={-1}
                  id={`${listId}-${idx}`}
                  data-idx={idx}
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  className={`searchselect__option ${isSelected ? 'is-selected' : ''} ${idx === highlighted ? 'is-highlighted' : ''}`}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => choose(opt)}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="searchselect__empty">{emptyText}</li>}
        </ul>
      )}

      {required && (
        <input
          ref={hiddenRef}
          className="dropdown__hidden-native"
          tabIndex={-1}
          aria-hidden="true"
          value={selectedOption ? String(selectedOption.value) : ''}
          required
          onChange={() => {}}
        />
      )}
    </div>
  );
};

export default SearchSelect;
