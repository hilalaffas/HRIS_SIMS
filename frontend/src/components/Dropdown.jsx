import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DropdownPortalContext } from './DropdownPortalContext';
import './Dropdown.css';

// [BARU] Mode portal (lihat DropdownPortalContext.js): tinggi menu maksimum
// (harus sama dengan max-height .dropdown__menu), jarak ke tepi layar, dan
// perkiraan tinggi tiap baris untuk memutuskan buka ke atas / ke bawah.
const MENU_MAX_HEIGHT = 260;
const MENU_GAP = 6;
const VIEWPORT_MARGIN = 12;
const ESTIMATED_ROW_HEIGHT = 40;
const ESTIMATED_SEARCH_HEIGHT = 52;

// Posisi menu (fixed) dari kotak trigger: buka ke bawah, kecuali ruang bawah
// lebih sempit daripada kebutuhan menu DAN ruang atas lebih lega.
function computeMenuPosition(triggerRect, estimatedHeight, matchTriggerWidth) {
  const spaceBelow = window.innerHeight - triggerRect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = triggerRect.top - VIEWPORT_MARGIN;
  const wantedHeight = Math.min(MENU_MAX_HEIGHT, estimatedHeight);
  const openUp = spaceBelow < wantedHeight && spaceAbove > spaceBelow;
  const available = openUp ? spaceAbove : spaceBelow;
  // top/bottom/right WAJIB diisi eksplisit ('auto' untuk sisi yang tidak dipakai):
  // CSS dasar .dropdown__menu punya `top: calc(100% + 6px)` (untuk mode absolute). Pada
  // menu fixed yang membuka ke ATAS, `top` itu ikut berlaku = di bawah layar, sehingga
  // menu "tidak muncul" padahal dropdown sudah berstatus terbuka.
  return {
    left: triggerRect.left,
    right: 'auto',
    minWidth: triggerRect.width,
    // Dropdown form selebar trigger; dropdown pill (filter) mengikuti isi terpanjang.
    width: matchTriggerWidth ? triggerRect.width : 'max-content',
    maxWidth: matchTriggerWidth ? 'none' : undefined,
    maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT, available - MENU_GAP)),
    ...(openUp
      ? { top: 'auto', bottom: window.innerHeight - triggerRect.top + MENU_GAP }
      : { top: triggerRect.bottom + MENU_GAP, bottom: 'auto' }),
  };
}

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
  const menuRef = useRef(null);
  const hiddenSelectRef = useRef(null);
  const usePortalMenu = useContext(DropdownPortalContext);
  const [menuPosition, setMenuPosition] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null); // elemen [data-theme] terdekat (agar token tema gelap berlaku)

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    if (!searchable || !normalizedQuery) return options;
    return options.filter((opt) => opt.label.toLocaleLowerCase('id-ID').includes(normalizedQuery));
  }, [options, query, searchable]);

  // [UBAH] selectedOption sekarang dicari langsung dari `options` (daftar
  // PENUH), BUKAN dari filteredOptions (hasil pencarian). Sebelumnya index
  // hasil pencarian dipakai untuk mengambil item dari daftar penuh yang
  // urutan/panjangnya beda -- makanya label yang tampil di kotak dropdown
  // selalu "nyasar" ke karyawan lain begitu ada query pencarian aktif
  // (mis. cari "hilal", yang kepilih malah karyawan lain yang kebetulan
  // ada di index yang sama pada daftar penuh).
  const selectedOption = options.find(
    (opt) => String(opt.value) === String(value)
  ) || null;

  // selectedIndexInFiltered HANYA dipakai untuk menentukan opsi mana yang
  // di-highlight duluan saat menu baru dibuka (lihat openMenu) -- ini tetap
  // benar dihitung dari filteredOptions karena highlightedIndex memang
  // index ke filteredOptions (dipakai moveHighlight & handleMenuKeyDown).
  const selectedIndexInFiltered = filteredOptions.findIndex(
    (opt) => String(opt.value) === String(value)
  );

  // Tutup menu saat klik di luar komponen.
  useEffect(() => {
    const handleClickOutside = (e) => {
      const insideTrigger = wrapperRef.current?.contains(e.target);
      const insideMenu = menuRef.current?.contains(e.target); // menu portal ada di luar wrapper
      if (wrapperRef.current && !insideTrigger && !insideMenu) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // [BARU] Mode portal: posisi menu mengikuti trigger saat halaman/popup di-scroll
  // atau jendela diubah ukurannya (menu fixed tidak ikut bergerak sendiri).
  useEffect(() => {
    if (!open || !usePortalMenu) return undefined;
    const reposition = () => {
      if (!wrapperRef.current) return;
      const estimatedHeight = filteredOptions.length * ESTIMATED_ROW_HEIGHT + (searchable ? ESTIMATED_SEARCH_HEIGHT : 0) + 12;
      setMenuPosition(computeMenuPosition(wrapperRef.current.getBoundingClientRect(), estimatedHeight, variant === 'form'));
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, usePortalMenu, filteredOptions.length, searchable, variant]);

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
    setHighlightedIndex(selectedIndexInFiltered >= 0 ? selectedIndexInFiltered : 0);
    if (usePortalMenu && wrapperRef.current) {
      const estimatedHeight = options.length * ESTIMATED_ROW_HEIGHT + (searchable ? ESTIMATED_SEARCH_HEIGHT : 0) + 12;
      setMenuPosition(computeMenuPosition(wrapperRef.current.getBoundingClientRect(), estimatedHeight, variant === 'form'));
      setPortalTarget(wrapperRef.current.closest('[data-theme]') || document.body);
    }
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

  // [BARU] Logika keyboard "saat menu terbuka" (Arrow/Enter/Escape),
  // dipusatkan di sini supaya bisa dipakai baik oleh tombol trigger MAUPUN
  // kotak pencarian. Sebelumnya logika Enter cuma ada di handler tombol
  // trigger (handleTriggerKeyDown) -- begitu fokus pindah ke kotak
  // pencarian (elemen <input>, sibling dari <button> di JSX, BUKAN anaknya),
  // event Enter di kotak pencarian tidak pernah nyampai ke handler itu sama
  // sekali, jadi ketik nama lalu Enter tidak menyeleksi apa-apa.
  const handleMenuKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filteredOptions[highlightedIndex];
      if (opt && !opt.disabled) {
        emitChange(opt.value);
        closeMenu();
      }
    } else if (e.key === 'Escape') {
      closeMenu();
    }
  };

  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    handleMenuKeyDown(e);
  };

  // Daftar pilihan dipisah supaya bisa dirender di tempat (default) atau lewat portal.
  const menuList = open && !disabled ? (
        <ul
          className={`dropdown__menu${usePortalMenu ? ' dropdown__menu--portal' : ''}`}
          role="listbox"
          ref={menuRef}
          style={usePortalMenu ? menuPosition || undefined : undefined}
        >
          {searchable && (
            <li className="dropdown__search-wrap">
              <input
                autoFocus
                type="search"
                className="dropdown__search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHighlightedIndex(0); }}
                onKeyDown={(e) => {
                  // [UBAH] Sebelumnya cuma e.stopPropagation() -- Enter/Arrow/
                  // Escape di kotak pencarian tidak diproses sama sekali.
                  // Sekarang pakai handler yang sama dengan tombol trigger
                  // (handleMenuKeyDown), supaya Enter benar-benar memilih opsi
                  // yang sedang di-highlight. stopPropagation tetap dipertahankan
                  // supaya keydown di sini tidak memicu shortcut lain di halaman.
                  e.stopPropagation();
                  handleMenuKeyDown(e);
                }}
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
  ) : null;

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

      {usePortalMenu && portalTarget ? createPortal(menuList, portalTarget) : menuList}

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
