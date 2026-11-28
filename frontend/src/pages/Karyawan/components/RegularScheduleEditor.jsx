// src/pages/Karyawan/components/RegularScheduleEditor.jsx
//
// [BARU] Editor jam kerja divisi REGULAR (dipakai form Kelola Divisi & Shift):
//   1. Jam dasar  : 08:00 - 17:00 / 09:00 - 18:00 / Custom (input jam masuk & pulang manual).
//   2. Jadwal khusus per hari: pilih hari tertentu (atau "Semua Hari") lalu atur jam masuk,
//      istirahat mulai, istirahat selesai, dan jam pulang. Berlaku menimpa jam dasar pada hari itu.
//
// Contoh:
//   <RegularScheduleEditor key={formVersion} value={regularSchedule} onChange={setRegularSchedule} />
// `key` harus berubah saat form di-reset / divisi lain diedit, supaya kartu jadwal khusus dimuat ulang.
import React, { useState } from 'react';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import {
  CUSTOM_PRESET_KEY,
  REGULAR_PRESETS,
  WEEKDAYS,
  detectPresetKey,
  expandRuleGroups,
  groupDayRules,
  splitCustomSchedule,
  composeCustomSchedule,
  requiredMinutesOf,
  validateRegularSchedule,
} from '../../../utils/regularSchedule';
import './RegularScheduleEditor.css';

const ALL_DAY_VALUES = WEEKDAYS.map((day) => day.value);
const DEFAULT_BREAK = { breakStartTime: '12:00', breakEndTime: '13:00' };

const formatNetHours = (minutes) => {
  if (!(minutes > 0)) return '-';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
};

export default function RegularScheduleEditor({ value, onChange }) {
  const [initial] = useState(() => splitCustomSchedule(value));
  const [presetKey, setPresetKey] = useState(() => {
    const key = detectPresetKey(value);
    return initial.dayRules.length !== value.dayRules.length ? CUSTOM_PRESET_KEY : key;
  });
  const [baseBreak, setBaseBreak] = useState(initial.baseBreak);
  const [groups, setGroups] = useState(() => groupDayRules(initial.dayRules));
  const error = validateRegularSchedule(value);
  const allDaysUsed = new Set(groups.flatMap((group) => group.days)).size >= ALL_DAY_VALUES.length; // semua hari sudah punya jadwal khusus

  const commitBase = (patch = {}, nextBreak = baseBreak, nextGroups = groups, key = presetKey) => {
    const schedule = { ...value, ...patch };
    const overrides = expandRuleGroups(nextGroups);
    onChange(key === CUSTOM_PRESET_KEY
      ? composeCustomSchedule(schedule, nextBreak, overrides)
      : { ...schedule, dayRules: overrides });
  };

  const selectPreset = (key) => {
    setPresetKey(key);
    const preset = REGULAR_PRESETS.find((item) => item.key === key);
    commitBase(preset ? { startTime: preset.startTime, endTime: preset.endTime } : {}, baseBreak, groups, key);
  };

  const commitGroups = (nextGroups) => {
    setGroups(nextGroups);
    commitBase({}, baseBreak, nextGroups);
  };

  const updateGroup = (index, patch) => commitGroups(groups.map((group, row) => (row === index ? { ...group, ...patch } : group)));
  const removeGroup = (index) => commitGroups(groups.filter((_, row) => row !== index));
  const addGroup = () => commitGroups([...groups, { days: [], startTime: value.startTime, endTime: value.endTime, ...DEFAULT_BREAK }]);

  const usedByOthers = (index) => new Set(groups.flatMap((group, row) => (row === index ? [] : group.days)));

  const toggleDay = (index, day) => {
    const days = groups[index].days;
    updateGroup(index, { days: days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort() });
  };

  // "Semua Hari" = semua hari yang belum dipakai kartu lain; klik lagi untuk mengosongkan.
  const toggleAllDays = (index) => {
    const blocked = usedByOthers(index);
    const available = ALL_DAY_VALUES.filter((day) => !blocked.has(day));
    const allSelected = available.every((day) => groups[index].days.includes(day));
    updateGroup(index, { days: allSelected ? [] : available });
  };

  const timeField = (index, field, label) => (
    <label>
      {label}
      <input type="time" value={groups[index][field]} onChange={(event) => updateGroup(index, { [field]: event.target.value })} />
    </label>
  );

  return (
    <div className="rse">
      <div className="rse-block">
        <h4>Jam Kerja Dasar <small>Senin–Jumat</small></h4>
        <div className="rse-presets" role="radiogroup" aria-label="Jam kerja dasar">
          {REGULAR_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              role="radio"
              aria-checked={presetKey === preset.key}
              className={presetKey === preset.key ? 'active' : ''}
              onClick={() => selectPreset(preset.key)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={presetKey === CUSTOM_PRESET_KEY}
            className={presetKey === CUSTOM_PRESET_KEY ? 'active' : ''}
            onClick={() => selectPreset(CUSTOM_PRESET_KEY)}
          >
            Custom
          </button>
        </div>
        {presetKey === CUSTOM_PRESET_KEY && (
          <div className="rse-custom">
            <label>Jam Masuk<input type="time" value={value.startTime} onChange={(event) => commitBase({ startTime: event.target.value })} /></label>
            {['breakStartTime', 'breakEndTime'].map((field, index) => (
              <label key={field}>{index === 0 ? 'Istirahat Mulai' : 'Istirahat Selesai'}
                <input type="time" value={baseBreak[field]} onChange={(event) => {
                  const next = { ...baseBreak, [field]: event.target.value };
                  setBaseBreak(next); commitBase({}, next);
                }} />
              </label>
            ))}
            <label>Jam Pulang<input type="time" value={value.endTime} onChange={(event) => commitBase({ endTime: event.target.value })} /></label>
          </div>
        )}
        {presetKey !== CUSTOM_PRESET_KEY && <p className="rse-help">Jam istirahat: 12.00–13.00</p>}
        {presetKey === CUSTOM_PRESET_KEY && <p className="rse-help">Jam istirahat berlaku Senin–Jumat, kecuali hari dengan jadwal khusus.</p>}
      </div>

      <div className="rse-block">
        <h4><CalendarClock size={15} /> Jadwal Khusus per Hari <small>opsional</small></h4>
        <p className="rse-help">Atur jam berbeda untuk hari tertentu, misalnya Jumat. Hari lain tetap memakai jam dasar. Absensi, laporan, dan lembur otomatis mengikuti.</p>

        {groups.map((group, index) => {
          const blocked = usedByOthers(index);
          const available = ALL_DAY_VALUES.filter((day) => !blocked.has(day));
          const allSelected = available.length > 0 && available.every((day) => group.days.includes(day));
          const netMinutes = requiredMinutesOf(group);
          return (
            <div className="rse-card" key={index}>
              <div className="rse-card-head">
                <div className="rse-days" role="group" aria-label="Pilih hari">
                  <button type="button" aria-pressed={allSelected} className={allSelected ? 'active all' : 'all'} onClick={() => toggleAllDays(index)}>Semua Hari</button>
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={group.days.includes(day.value)}
                      className={group.days.includes(day.value) ? 'active' : ''}
                      disabled={blocked.has(day.value)}
                      title={blocked.has(day.value) ? 'Hari ini sudah punya jadwal khusus lain' : undefined}
                      onClick={() => toggleDay(index, day.value)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="rse-remove" onClick={() => removeGroup(index)} aria-label="Hapus jadwal khusus"><Trash2 size={15} /></button>
              </div>
              <div className="rse-times">
                {timeField(index, 'startTime', 'Jam Masuk')}
                {timeField(index, 'breakStartTime', 'Istirahat Mulai')}
                {timeField(index, 'breakEndTime', 'Istirahat Selesai')}
                {timeField(index, 'endTime', 'Jam Pulang')}
              </div>
              <small className="rse-net">
                {group.days.length === 0 ? 'Pilih minimal satu hari. ' : ''}Lama kerja bersih: <b>{formatNetHours(netMinutes)}</b>
              </small>
            </div>
          );
        })}

        <button type="button" className="rse-add" onClick={addGroup} disabled={allDaysUsed}>
          <Plus size={14} /> Tambah Jadwal Khusus
        </button>
      </div>

      {error && <p className="rse-error" role="alert">{error}</p>}
    </div>
  );
}
