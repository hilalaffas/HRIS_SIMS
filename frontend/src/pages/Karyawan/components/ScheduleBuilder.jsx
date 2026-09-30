import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Users } from 'lucide-react';
import './ScheduleBuilder.css';
import { getHolidaysByMonth } from '../../../services/holidayService';
import { getJadwalByMonth, publishJadwal } from '../../../services/jadwalService';
import {
  generateMonthSchedule,
  flattenScheduleEntries,
  getNextMonthValue,
  shiftPatternLabel,
  shortShiftName,
} from '../utils/scheduleGenerator';

// Nilai option target: "emp:<employeeId>" atau "div:<divisiId>"
const ScheduleBuilder = ({ karyawanList, divisiList, shifts, onToast }) => {
  const [target, setTarget] = useState('');
  const [monthValue, setMonthValue] = useState(getNextMonthValue());
  const [shiftId, setShiftId] = useState('');
  const [preview, setPreview] = useState(null);
  const [overwriteCount, setOverwriteCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Hanya karyawan aktif yang bisa dijadwalkan
  const activeEmployees = useMemo(
    () => (karyawanList || []).filter((k) => k.isActive !== false),
    [karyawanList]
  );

  // Pola shift default = shift pertama yang tersedia
  useEffect(() => {
    if (!shiftId && shifts.length > 0) setShiftId(String(shifts[0].shiftId));
  }, [shifts, shiftId]);

  // Target pertama otomatis terpilih supaya form langsung siap dipakai
  useEffect(() => {
    if (!target && activeEmployees.length > 0) {
      setTarget(`emp:${activeEmployees[0].employeeId}`);
    }
  }, [activeEmployees, target]);

  // Karyawan yang dicakup oleh target terpilih
  const resolveEmployees = (value) => {
    const [kind, rawId] = value.split(':');
    const id = Number(rawId);
    if (kind === 'emp') return activeEmployees.filter((k) => k.employeeId === id);
    if (kind === 'div') return activeEmployees.filter((k) => k.divisi?.id === id);
    return [];
  };

  // Tipe divisi dari target -> dipakai untuk memilih pola shift default
  const resolveTipe = (value) => {
    const [kind, rawId] = value.split(':');
    const id = Number(rawId);
    if (kind === 'div') return divisiList.find((d) => d.id === id)?.tipeDivisi;
    if (kind === 'emp') return activeEmployees.find((k) => k.employeeId === id)?.divisi?.tipeDivisi;
    return undefined;
  };

  // Ganti target/bulan/pola -> preview lama tidak berlaku lagi
  const resetPreview = () => {
    setPreview(null);
    setOverwriteCount(0);
  };

  const handleTargetChange = (value) => {
    setTarget(value);
    resetPreview();
    // Divisi Shifting default ke Shift 1, selain itu Shift Normal
    const wantedCode = resolveTipe(value) === 'SHIFTING' ? 'SHIFT_1' : 'NORMAL';
    const matched = shifts.find((s) => s.code === wantedCode);
    if (matched) setShiftId(String(matched.shiftId));
  };

  const handleGenerate = async () => {
    const employees = resolveEmployees(target);
    const shift = shifts.find((s) => String(s.shiftId) === shiftId);

    if (!target || !monthValue || !shift) {
      onToast('Lengkapi karyawan/divisi, periode bulan, dan pola shift.', 'error');
      return;
    }
    if (employees.length === 0) {
      onToast('Tidak ada karyawan aktif pada pilihan ini.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const [year, month] = monthValue.split('-').map(Number);

      // Hari libur (nasional & custom) otomatis jadi OFF. Kalau gagal diambil,
      // preview tetap dibuat tanpa libur dan admin diberi peringatan.
      let holidayKeys = new Set();
      try {
        const res = await getHolidaysByMonth(year, month, { silent: true });
        const list = res?.data || res || [];
        holidayKeys = new Set(list.map((h) => h.date));
      } catch {
        onToast('Data hari libur gagal dimuat, preview dibuat tanpa hari libur.', 'error');
      }

      const result = generateMonthSchedule({ employees, monthValue, shift, holidayKeys });
      setPreview({ ...result, shift });

      // Info: berapa karyawan yang sudah punya jadwal di bulan ini (akan ditimpa)
      try {
        const existing = await getJadwalByMonth(year, month, { silent: true });
        const ids = new Set(employees.map((e) => e.employeeId));
        const overwritten = new Set(
          (existing?.data || existing || [])
            .filter((row) => ids.has(row.employeeId))
            .map((row) => row.employeeId)
        );
        setOverwriteCount(overwritten.size);
      } catch {
        setOverwriteCount(0);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!preview) return;
    setIsPublishing(true);
    try {
      const res = await publishJadwal(flattenScheduleEntries(preview.rows));
      const summary = res?.data || res || {};
      onToast(
        `Jadwal berhasil dipublish (${summary.created ?? 0} baru, ${summary.updated ?? 0} diperbarui).`,
        'success'
      );
      setOverwriteCount(0);
      setPreview(null);
    } catch (err) {
      onToast(err.message || 'Gagal mempublish jadwal.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const hasShifts = shifts.length > 0;

  return (
    <div className="card_schedule_builder">
      <div className="heading_schedule_builder">
        <CalendarDays size={20} className="icon_schedule_builder" />
        <div>
          <h2>Builder Jadwal Absensi (Bulanan)</h2>
          <p>Buat jadwal shift bulanan untuk Staff / Divisi.</p>
        </div>
      </div>

      <div className="form_schedule_builder">
        <label>
          Pilih Karyawan / Divisi
          <select value={target} onChange={(e) => handleTargetChange(e.target.value)}>
            <optgroup label="Karyawan">
              {activeEmployees.map((k) => (
                <option key={`emp:${k.employeeId}`} value={`emp:${k.employeeId}`}>
                  {k.fullName}{k.position ? ` (${k.position})` : ''}
                </option>
              ))}
            </optgroup>
            <optgroup label="Divisi">
              {divisiList.map((d) => (
                <option key={`div:${d.id}`} value={`div:${d.id}`}>
                  {d.namaDivisi} (Divisi)
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label>
          Periode Bulan
          <input
            type="month"
            value={monthValue}
            onChange={(e) => {
              setMonthValue(e.target.value);
              resetPreview();
            }}
          />
        </label>

        <label>
          Pola Shift
          <select
            value={shiftId}
            onChange={(e) => {
              setShiftId(e.target.value);
              resetPreview();
            }}
            disabled={!hasShifts}
          >
            {shifts.map((s) => (
              <option key={s.shiftId} value={s.shiftId}>{shiftPatternLabel(s)}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn-generate_schedule_builder"
          onClick={handleGenerate}
          disabled={isGenerating || !hasShifts}
        >
          {isGenerating ? 'Membuat jadwal...' : 'Generate Jadwal Bulanan'}
        </button>
      </div>

      {preview && (
        <>
          <h3 className="preview-label_schedule_builder">Preview Jadwal Dibuat:</h3>

          {overwriteCount > 0 && (
            <div className="notice_schedule_builder">
              {overwriteCount} karyawan sudah punya jadwal di periode ini. Jadwal lama akan ditimpa saat dipublish.
            </div>
          )}

          <div className="table-wrap_schedule_builder">
            <table className="table_schedule_builder">
              <thead>
                <tr>
                  <th className="sticky-col_schedule_builder">NAMA</th>
                  {preview.days.map((d) => (
                    <th key={d.key} className={d.isOff ? 'off-head_schedule_builder' : ''}>
                      {d.headerLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.employeeId}>
                    <td className="sticky-col_schedule_builder">
                      <strong>{row.name}</strong>
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.date}>
                        {cell.shiftId ? (
                          <span className="tag-shift_schedule_builder">{shortShiftName(preview.shift.name)}</span>
                        ) : (
                          <span className="tag-off_schedule_builder">OFF / LIBUR</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="btn-publish_schedule_builder"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            <Users size={16} />
            {isPublishing ? 'Mempublish...' : 'Publish Jadwal ke Karyawan'}
          </button>
        </>
      )}
    </div>
  );
};

export default ScheduleBuilder;
