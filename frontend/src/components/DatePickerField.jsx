// src/components/DatePickerField.jsx
//
// [BARU] Pemilih satu tanggal dengan kalender mini yang MENANDAI HARI LIBUR
// (merah) dan akhir pekan -- tampilan mengikuti kalender di form Ajukan Cuti
// (LeaveTypeDateSection), tapi berdiri sendiri dan bisa dipakai di halaman mana
// pun. Hari libur dimuat per bulan yang sedang ditampilkan (holidayService) dan
// digabung dengan LOCAL_HOLIDAYS_2026 sebagai cadangan saat API gagal.
//
// Nilai selalu 'YYYY-MM-DD' (tanggal lokal). Tanggal di luar minDate/maxDate
// dinonaktifkan. Esc / klik di luar menutup kalender.
//
// Contoh pemakaian:
// <DatePickerField value="2026-11-02" onChange={setDate} maxDate="2026-11-02" ariaLabel="Dari tanggal" />
import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { LOCAL_HOLIDAYS_2026 } from '../constants/holidays';
import { getHolidaysByMonth } from '../services/holidayService';
import './DatePickerField.css';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WEEKDAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const pad = (value) => String(value).padStart(2, '0');
const toKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

const formatDisplay = (key) => {
  if (!key) return '';
  const [year, month, day] = key.split('-');
  return `${day}/${month}/${year}`;
};

const parseViewMonth = (key) => {
  const [year, month] = (key || '').split('-').map(Number);
  if (year && month) return { year, month: month - 1 };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
};

// Sel kalender satu bulan: null = kotak kosong sebelum tanggal 1.
function buildMonthCells(year, month) {
  const leadingBlanks = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= totalDays; day += 1) {
    const dayOfWeek = new Date(year, month, day).getDay();
    cells.push({ day, key: toKey(year, month, day), isWeekend: dayOfWeek === 0 || dayOfWeek === 6 });
  }
  return cells;
}

export default function DatePickerField({
  value,
  onChange,
  minDate = '',
  maxDate = '',
  placeholder = 'dd/mm/yyyy',
  ariaLabel = 'Pilih tanggal',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState(() => parseViewMonth(value));
  const [holidayMap, setHolidayMap] = useState(() => ({ ...LOCAL_HOLIDAYS_2026 }));
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelId = useId();
  const todayKey = toKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  // Muat hari libur bulan yang sedang tampil (gagal = tetap pakai data lokal).
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    getHolidaysByMonth(view.year, view.month + 1, { silent: true })
      .then((result) => {
        if (cancelled) return;
        const list = Array.isArray(result) ? result : result?.data || [];
        setHolidayMap((current) => {
          const next = { ...current };
          list.forEach((holiday) => {
            if (holiday?.date) next[holiday.date] = holiday.name || holiday.nama || 'Hari libur';
          });
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, view.year, view.month]);

  // Esc / klik di luar menutup kalender.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isDisabled = (key) => (Boolean(minDate) && key < minDate) || (Boolean(maxDate) && key > maxDate);

  const openPanel = () => {
    setView(parseViewMonth(value));
    setIsOpen(true);
  };

  const shiftMonth = (delta) => {
    const target = new Date(view.year, view.month + delta, 1);
    setView({ year: target.getFullYear(), month: target.getMonth() });
  };

  const selectDate = (key) => {
    if (isDisabled(key)) return;
    if (key !== value) onChange(key);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const firstOfMonthKey = toKey(view.year, view.month, 1);
  const lastOfMonthKey = toKey(view.year, view.month, new Date(view.year, view.month + 1, 0).getDate());
  const canGoPrev = !minDate || minDate < firstOfMonthKey;
  const canGoNext = !maxDate || maxDate > lastOfMonthKey;

  return (
    <div className="dpf" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`dpf-trigger${isOpen ? ' is-open' : ''}`}
        onClick={() => (isOpen ? setIsOpen(false) : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={ariaLabel}
      >
        <CalendarDays aria-hidden="true" />
        <span className={value ? '' : 'dpf-placeholder'}>{formatDisplay(value) || placeholder}</span>
      </button>

      {isOpen && (
        <div id={panelId} className="dpf-pop" role="dialog" aria-label={ariaLabel}>
          <header className="dpf-head">
            <strong>{MONTH_NAMES[view.month]} {view.year}</strong>
            <div className="dpf-nav">
              <button type="button" onClick={() => shiftMonth(-1)} disabled={!canGoPrev} aria-label="Bulan sebelumnya">
                <ChevronLeft aria-hidden="true" />
              </button>
              <button type="button" onClick={() => shiftMonth(1)} disabled={!canGoNext} aria-label="Bulan berikutnya">
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="dpf-weekdays">
            {WEEKDAY_NAMES.map((name, index) => (
              <span key={name} className={index === 0 || index === 6 ? 'is-weekend' : ''}>{name}</span>
            ))}
          </div>

          <div className="dpf-grid">
            {buildMonthCells(view.year, view.month).map((cell, index) => {
              if (!cell) return <span key={`blank-${index}`} />;
              const holidayName = holidayMap[cell.key];
              const classNames = [
                'dpf-day',
                cell.isWeekend ? 'is-weekend' : '',
                holidayName ? 'is-holiday' : '',
                cell.key === todayKey ? 'is-today' : '',
                cell.key === value ? 'is-selected' : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={classNames}
                  disabled={isDisabled(cell.key)}
                  onClick={() => selectDate(cell.key)}
                  title={holidayName || undefined}
                  aria-pressed={cell.key === value}
                  aria-label={holidayName ? `${formatDisplay(cell.key)}, ${holidayName}` : formatDisplay(cell.key)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <footer className="dpf-legend">
            <span><i className="dpf-dot dpf-dot--today" /> Hari ini</span>
            <span><i className="dpf-dot dpf-dot--holiday" /> Libur</span>
          </footer>
        </div>
      )}
    </div>
  );
}
