// src/pages/Laporan/components/ReportRangeControl.jsx
//
// [BARU] Pemilih rentang Laporan Absen. Tiga mode (tombol segmen):
//   - Per Periode   : PeriodPicker periode tutup buku (21 s/d 20) -- perilaku lama
//   - Hari Ini      : data hari ini saja (tanpa input tambahan)
//   - Pilih Tanggal : Dari - Sampai lewat kalender yang menandai hari libur
//                     (maks. 62 hari, tidak boleh melewati hari ini)
// Komponen ini hanya tampilan; state & hitung rentang ada di tabs/AttendanceReportTab.jsx.
//
// Contoh pemakaian:
// <ReportRangeControl mode="CUSTOM" onModeChange={fn} period={period} maxPeriod={current}
//   onPeriodChange={fn} customRange={{ from, to }} onCustomFromChange={fn} onCustomToChange={fn} />
import React from 'react';
import { CalendarCheck } from 'lucide-react';
import DatePickerField from '../../../components/DatePickerField';
import { MAX_CUSTOM_RANGE_DAYS, RANGE_MODE_OPTIONS, RANGE_MODES } from '../config/laporanConfig';
import { formatLongDay, getCustomMaxEnd, getTodayKey } from '../utils/reportRange';
import PeriodPicker from './PeriodPicker';
import './ReportRangeControl.css';

export default function ReportRangeControl({
  mode,
  onModeChange,
  period,
  maxPeriod,
  onPeriodChange,
  customRange,
  onCustomFromChange,
  onCustomToChange,
}) {
  const todayKey = getTodayKey();

  return (
    <div className="lpr-range">
      <div className="lpr-range-modes" role="group" aria-label="Pilih rentang laporan">
        {RANGE_MODE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`lpr-range-mode${mode === option.key ? ' is-active' : ''}`}
            aria-pressed={mode === option.key}
            title={option.hint}
            onClick={() => onModeChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === RANGE_MODES.PERIOD && (
        <PeriodPicker value={period} maxValue={maxPeriod} onChange={onPeriodChange} />
      )}

      {mode === RANGE_MODES.TODAY && (
        <p className="lpr-range-today">
          <CalendarCheck aria-hidden="true" />
          {formatLongDay(todayKey)}
        </p>
      )}

      {mode === RANGE_MODES.CUSTOM && (
        <div className="lpr-range-custom">
          <div className="lpr-range-date">
            <span>Dari</span>
            <DatePickerField
              value={customRange.from}
              onChange={onCustomFromChange}
              maxDate={todayKey}
              ariaLabel="Laporan dari tanggal"
            />
          </div>
          <div className="lpr-range-date">
            <span>Sampai</span>
            <DatePickerField
              value={customRange.to}
              onChange={onCustomToChange}
              minDate={customRange.from}
              maxDate={getCustomMaxEnd(customRange.from)}
              ariaLabel="Laporan sampai tanggal"
            />
          </div>
          <p className="lpr-range-hint">Maksimal {MAX_CUSTOM_RANGE_DAYS} hari, sampai hari ini.</p>
        </div>
      )}
    </div>
  );
}
