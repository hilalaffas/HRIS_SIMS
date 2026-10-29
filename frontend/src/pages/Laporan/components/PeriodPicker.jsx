// src/pages/Laporan/components/PeriodPicker.jsx
//
// [BARU] Navigasi periode tutup buku (21 s/d 20) yang bisa DIKLIK: panah ‹ › tetap
// untuk geser satu periode, dan label di tengah membuka panel pilih periode
// (tahun + 12 periode) supaya HRD bisa lompat ke periode mana pun tanpa menekan
// panah berkali-kali.
//
// Satu periode = periode yang BERAKHIR di bulan itu (mis. kartu "Nov" = 21 Okt - 20 Nov),
// sama dengan { year, month } milik getPeriodRange() di modul Absensi (month 0-11).
//
// Aksesibilitas & gerak: dialog dengan Esc / klik di luar untuk menutup, navigasi
// panah di grid (roving tabindex), animasi hanya transform + opacity dan otomatis
// diredam oleh prefers-reduced-motion lewat token --motion-* (styles/motion.css).
//
// Contoh pemakaian:
// <PeriodPicker value={{ year: 2026, month: 10 }} maxValue={currentPeriod} onChange={setPeriod} />
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarCheck, CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import usePresence from '../../../hooks/usePresence';
import { formatPeriodLabel, getPeriodRange } from '../../Absensi/utils/monthlyAttendance';
import './PeriodPicker.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const COLUMNS = 3;
const EXIT_MS = 160; // = durasi animasi keluar di PeriodPicker.css
const YEARS_BACK = 5; // batas bawah pilihan tahun dari periode berjalan
const SLIDE_PX = 16;

const toIndex = ({ year, month }) => year * 12 + month;
const formatShortDate = (date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

export default function PeriodPicker({ value, maxValue, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.year);
  const [slide, setSlide] = useState(0); // arah geser tahun: -1 | 0 | 1 (dipakai animasi kartu)

  const { mounted, closing } = usePresence(isOpen, EXIT_MS);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const cellRefs = useRef([]);
  const panelId = useId();

  const minYear = maxValue.year - YEARS_BACK;
  const minIndex = minYear * 12;
  const maxIndex = toIndex(maxValue);
  const valueIndex = toIndex(value);
  const label = formatPeriodLabel(value.year, value.month);

  const isEnabled = useCallback(
    (year, month) => toIndex({ year, month }) >= minIndex && toIndex({ year, month }) <= maxIndex,
    [minIndex, maxIndex],
  );

  const cells = useMemo(() => Array.from({ length: 12 }, (_, month) => {
    const { start, end } = getPeriodRange(viewYear, month);
    return {
      month,
      name: MONTH_NAMES[month],
      range: `${formatShortDate(start)} - ${formatShortDate(end)}`,
      enabled: isEnabled(viewYear, month),
      selected: toIndex({ year: viewYear, month }) === valueIndex,
      current: toIndex({ year: viewYear, month }) === maxIndex,
    };
  }), [viewYear, valueIndex, maxIndex, isEnabled]);

  // Sel yang boleh menerima Tab (roving tabindex): yang terpilih, kalau tidak ada -> sel aktif pertama.
  const tabMonth = (cells.find((cell) => cell.selected && cell.enabled) || cells.find((cell) => cell.enabled))?.month;

  // ---------- buka / tutup ----------
  const openPanel = () => {
    setViewYear(value.year);
    setSlide(0);
    setIsOpen(true);
  };

  const closePanel = useCallback((returnFocus = false) => {
    setIsOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) closePanel();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closePanel(true);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closePanel]);

  // Fokus ke sel yang bisa Tab begitu panel muncul (pengguna keyboard langsung bisa memilih).
  useEffect(() => {
    if (!isOpen) return undefined;
    const frameId = window.requestAnimationFrame(() => cellRefs.current[tabMonth]?.focus());
    return () => window.cancelAnimationFrame(frameId);
    // Hanya saat panel dibuka -- bukan setiap ganti tahun (fokus sudah di dalam panel).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---------- pilih ----------
  const selectPeriod = (year, month) => {
    if (!isEnabled(year, month)) return;
    if (year !== value.year || month !== value.month) onChange({ year, month });
    closePanel(true);
  };

  const shiftYear = (delta) => {
    const next = viewYear + delta;
    if (next < minYear || next > maxValue.year) return;
    setSlide(delta);
    setViewYear(next);
  };

  // Panah ‹ › di pil: geser satu periode (perilaku lama tetap ada).
  const shiftPeriod = (delta) => {
    const target = new Date(value.year, value.month + delta, 1);
    const next = { year: target.getFullYear(), month: target.getMonth() };
    if (toIndex(next) < minIndex || toIndex(next) > maxIndex) return;
    onChange(next);
  };

  const handleCellKeyDown = (event, month) => {
    const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLUMNS, ArrowDown: COLUMNS };
    let target = null;
    if (event.key in steps) target = month + steps[event.key];
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = 11;
    if (target === null) return;
    event.preventDefault();
    if (target >= 0 && target <= 11 && cells[target].enabled) cellRefs.current[target]?.focus();
  };

  return (
    <div className="lpr-pp" ref={rootRef}>
      <div className={`lpr-pp-pill${isOpen ? ' is-open' : ''}`}>
        <button
          type="button"
          className="lpr-pp-step"
          onClick={() => shiftPeriod(-1)}
          disabled={valueIndex <= minIndex}
          aria-label="Periode sebelumnya"
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        <button
          ref={triggerRef}
          type="button"
          className="lpr-pp-trigger"
          onClick={() => (isOpen ? closePanel() : openPanel())}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={panelId}
          title="Pilih periode"
        >
          <CalendarDays className="lpr-pp-trigger-icon" aria-hidden="true" />
          <strong key={label} className="lpr-pp-label" aria-live="polite">{label}</strong>
          <ChevronDown className="lpr-pp-caret" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="lpr-pp-step"
          onClick={() => shiftPeriod(1)}
          disabled={valueIndex >= maxIndex}
          aria-label="Periode berikutnya"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      {mounted && (
        <div
          id={panelId}
          className={`lpr-pp-pop${closing ? ' is-closing' : ''}`}
          role="dialog"
          aria-label="Pilih periode tutup buku"
        >
          <header className="lpr-pp-head">
            <button
              type="button"
              className="lpr-pp-step"
              onClick={() => shiftYear(-1)}
              disabled={viewYear <= minYear}
              aria-label="Tahun sebelumnya"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <strong key={viewYear} className="lpr-pp-year">{viewYear}</strong>
            <button
              type="button"
              className="lpr-pp-step"
              onClick={() => shiftYear(1)}
              disabled={viewYear >= maxValue.year}
              aria-label="Tahun berikutnya"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </header>

          <div
            key={viewYear}
            className="lpr-pp-grid"
            style={{ '--pp-shift': `${slide * SLIDE_PX}px` }}
          >
            {cells.map((cell) => (
              <button
                key={cell.name}
                ref={(node) => { cellRefs.current[cell.month] = node; }}
                type="button"
                className={`lpr-pp-cell${cell.selected ? ' is-selected' : ''}${cell.current ? ' is-current' : ''}`}
                style={{ '--i': cell.month }}
                disabled={!cell.enabled}
                tabIndex={cell.month === tabMonth ? 0 : -1}
                aria-pressed={cell.selected}
                aria-label={`Periode ${cell.range} ${cell.month === 0 ? viewYear : ''}`.trim()}
                onClick={() => selectPeriod(viewYear, cell.month)}
                onKeyDown={(event) => handleCellKeyDown(event, cell.month)}
              >
                <span className="lpr-pp-cell-name">{cell.name}</span>
                <span className="lpr-pp-cell-range">{cell.range}</span>
              </button>
            ))}
          </div>

          <footer className="lpr-pp-foot">
            <span>Periode berakhir pada bulan yang dipilih</span>
            <button
              type="button"
              className="lpr-pp-today"
              onClick={() => selectPeriod(maxValue.year, maxValue.month)}
              disabled={valueIndex === maxIndex}
            >
              <CalendarCheck aria-hidden="true" /> Periode berjalan
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
