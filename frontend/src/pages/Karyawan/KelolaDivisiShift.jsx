import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Layers3, RotateCcw, Save, Send } from 'lucide-react';
import DataDivisi from './components/DataDivisi';
import { getAllDivisi, createDivisi, updateDivisi } from '../../services/divisiService';
import { getKaryawanList } from '../../services/karyawanService';
import { getAllShift } from '../../services/shiftService';
import { getJadwalByMonth, publishJadwal, resetJadwal } from '../../services/jadwalService';
import { getHolidaysByMonth } from '../../services/holidayService';
import './KelolaDivisiShift.css';
import './components/DataDivisi.css';

const shiftTemplates = {
  2: [['Shift 1 (Siang)', '07:00', '19:00'], ['Shift 2 (Malam)', '19:00', '07:00']],
  3: [['Shift 1 (Pagi)', '07:00', '15:00'], ['Shift 2 (Siang)', '15:00', '23:00'], ['Shift 3 (Malam)', '23:00', '07:00']],
  4: [['Shift 1 (Pagi)', '05:00', '11:00'], ['Shift 2 (Siang)', '11:00', '17:00'], ['Shift 3 (Sore)', '17:00', '23:00'], ['Shift 4 (Malam)', '23:00', '05:00']],
};
const makeShiftTemplate = (count) => (shiftTemplates[count] || shiftTemplates[3]).map(([name, startTime, endTime]) => ({ name, startTime, endTime }));
const defaultShifts = () => makeShiftTemplate(3);
const SHIFT_CODES = ['P', 'S', 'SO', 'M', 'X', 'Y'];
const shiftHours = (shift) => {
  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  const [endHour, endMinute] = shift.endTime.split(':').map(Number);
  return ((endHour * 60 + endMinute - startHour * 60 - startMinute + 1440) % 1440) / 60;
};
const isValidCustomShiftSet = (configuredShifts) => {
  const durations = configuredShifts.map(shiftHours);
  if (durations.some((hours) => hours <= 0 || hours > 12)) return false;
  if (new Set(configuredShifts.map((shift) => shift.startTime)).size !== configuredShifts.length) return false;
  const intervals = configuredShifts.flatMap((shift) => {
    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    const [endHour, endMinute] = shift.endTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return end > start ? [[start, end]] : [[start, 1440], [0, end]];
  }).sort((a, b) => a[0] - b[0]);
  return intervals.every((interval, index) => index === 0 || intervals[index - 1][1] <= interval[0]);
};
const timeHours = (shift) => {
  if (!shift) return 0;
  if (shift.code === 'NORMAL') return 8;
  const [sh, sm] = shift.startTime.split(':').map(Number);
  const [eh, em] = shift.endTime.split(':').map(Number);
  return ((eh * 60 + em - sh * 60 - sm + 1440) % 1440) / 60 || 0;
};
const shiftCodesByCount = { 2: ['S', 'M'], 3: ['P', 'S', 'M'], 4: ['P', 'S', 'SO', 'M'] };

export default function KelolaDivisiShift({ standalone = false, karyawanList: initialEmployees }) {
  const [tab, setTab] = useState('divisi');
  const [name, setName] = useState('');
  const [type, setType] = useState('REGULAR');
  const [shifts, setShifts] = useState(defaultShifts());
  const [shiftMode, setShiftMode] = useState('TEMPLATE');
  const [editingId, setEditingId] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [employees, setEmployees] = useState(initialEmployees || []);
  const [masterShifts, setMasterShifts] = useState([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [entries, setEntries] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const formCardRef = useRef(null);
  const nameInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const notify = (message, type = 'success') => setToast({ message, type });
  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(() => setToast((current) => ({ ...current, message: '' })), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const days = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => i + 1);
  }, [month]);

  const loadMonthEntries = async () => {
    const [year, monthNumber] = month.split('-').map(Number);
    const data = await getJadwalByMonth(year, monthNumber);
    setEntries(data || []);
  };

  const load = async () => {
    setError('');
    try {
      // GET divisi juga melengkapi link shift jadwal yang kosong pada data lama.
      // Ambil master shift setelahnya agar ID hasil perbaikan sudah tersedia.
      const d = await getAllDivisi();
      const [e, s] = await Promise.all([initialEmployees ? Promise.resolve(initialEmployees) : getKaryawanList(), getAllShift()]);
      setDivisions(d || []); setEmployees(e || []); setMasterShifts(s || []);
    } catch (err) { setError(err.message || 'Data divisi atau karyawan gagal dimuat.'); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (initialEmployees) setEmployees(initialEmployees); }, [initialEmployees]);
  useEffect(() => {
    const [y, m] = month.split('-').map(Number);
    getJadwalByMonth(y, m).then((data) => setEntries(data || [])).catch((err) => setError(err.message || 'Jadwal gagal dimuat.'));
  }, [month]);

  const resetForm = () => { setName(''); setType('REGULAR'); setShifts(defaultShifts()); setShiftMode('TEMPLATE'); setEditingId(null); };
  const changeType = (nextType) => {
    setType(nextType);
    if (nextType === 'SHIFTING' && !editingId && shifts.length === 1 && shifts[0].startTime === '08:00') setShifts(defaultShifts());
  };
  const editDivision = (division) => {
    setEditingId(division.id); setName(division.namaDivisi); setType(division.tipeDivisi || 'REGULAR');
    const currentShifts = division.shifts?.length ? division.shifts.map(({ name: shiftName, startTime, endTime, scheduleShiftId }) => ({ name: shiftName, startTime, endTime, scheduleShiftId })) : defaultShifts();
    setShifts(currentShifts);
    const templateShifts = shiftTemplates[currentShifts.length]?.map(([shiftName, startTime, endTime]) => ({ name: shiftName, startTime, endTime })) || [];
    setShiftMode(currentShifts.length > 4 || currentShifts.some((shift, index) => shiftHours(shift) !== 24 / currentShifts.length
      || shift.name !== templateShifts[index]?.name
      || shift.startTime !== templateShifts[index]?.startTime
      || shift.endTime !== templateShifts[index]?.endTime) ? 'CUSTOM' : 'TEMPLATE');
    window.requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => nameInputRef.current?.focus({ preventScroll: true }), 350);
    });
  };
  const saveDivision = async () => {
    if (!name.trim()) return notify('Nama divisi wajib diisi.', 'error');
    if (type === 'SHIFTING' && (shifts.length < 2 || shifts.length > 6)) return notify('Mode Custom mendukung 2 sampai 6 shift.', 'error');
    const targetHours = { 2: 12, 3: 8, 4: 6 }[shifts.length];
    if (type === 'SHIFTING' && shifts.some((shift) => !shift.name.trim() || !shift.startTime || !shift.endTime)) return notify('Setiap shift wajib memiliki nama, jam masuk, dan jam pulang.', 'error');
    if (type === 'SHIFTING' && !isValidCustomShiftSet(shifts)) return notify('Jadwal shift tidak boleh saling bertabrakan; durasi tiap shift maksimal 12 jam.', 'error');
    if (type === 'SHIFTING' && shiftMode === 'TEMPLATE' && shifts.some((shift) => shiftHours(shift) !== targetHours)) return notify(`Template ${shifts.length} shift harus memakai durasi ${targetHours} jam per shift. Gunakan Mode Custom untuk mengatur durasi berbeda.`, 'error');
    setBusy(true);
    try {
      const wasEditing = Boolean(editingId);
      if (editingId) await updateDivisi(editingId, name.trim(), type, type === 'REGULAR' ? [] : shifts);
      else await createDivisi(name.trim(), type, type === 'REGULAR' ? [] : shifts);
      await load(); resetForm(); notify(wasEditing ? 'Pengaturan divisi berhasil diperbarui.' : 'Divisi berhasil disimpan.', 'success');
    } catch (err) { notify(err.message || 'Divisi gagal disimpan.', 'error'); }
    finally { setBusy(false); }
  };

  const shiftFor = (id) => masterShifts.find((s) => Number(s.shiftId) === Number(id));
  const divisionFor = (employee) => divisions.find((division) => Number(division.id) === Number(employee.divisi?.id)) || employee.divisi;
  const isShiftingEmployee = (employee) => String(divisionFor(employee)?.tipeDivisi || '').toUpperCase() === 'SHIFTING';
  const shiftingDivisions = divisions.filter((division) => String(division.tipeDivisi || '').toUpperCase() === 'SHIFTING');
  const visibleEmployees = employees.filter((employee) => employee.isActive !== false
    && isShiftingEmployee(employee)
    && (divisionFilter === 'all' || String(divisionFor(employee)?.id) === divisionFilter));
  const employeeShifts = (employee) => {
    const division = divisionFor(employee);
    if (isShiftingEmployee(employee)) {
      return (Array.isArray(division.shifts) ? division.shifts : [])
        .map((detail) => masterShifts.find((shift) =>
          Number(shift.divisionId) === Number(division.id)
          && shift.name === detail.name
          && shift.startTime === detail.startTime
          && shift.endTime === detail.endTime
        ) || shiftFor(detail.scheduleShiftId))
        .filter(Boolean);
    }
    return [];
  };
  const shiftColorFor = (employee, shift) => {
    const configuredShifts = employeeShifts(employee);
    const index = configuredShifts.findIndex((item) => Number(item.shiftId) === Number(shift.shiftId));
    return shiftCodesByCount[configuredShifts.length]?.[index] || SHIFT_CODES[index] || 'P';
  };
  const shiftLegend = [...new Map(visibleEmployees.flatMap((employee) => employeeShifts(employee).map((shift) => {
    const code = shiftColorFor(employee, shift);
    const labels = { P: 'P: PAGI', S: 'S: SIANG', SO: 'SO: SORE', M: 'M: MALAM', X: 'X: SHIFT 5', Y: 'Y: SHIFT 6' };
    return [code, { code, label: labels[code] || `${code}: ${shift.name.toUpperCase()}` }];
  }))).values()].sort((a, b) => SHIFT_CODES.indexOf(a.code) - SHIFT_CODES.indexOf(b.code));
  const entryKey = (employeeId, date) => `${employeeId}|${date}`;
  const setCell = (employeeId, date, shiftId) => setEntries((prev) => {
    const map = new Map(prev.map((x) => [entryKey(x.employeeId, x.date), x]));
    const key = entryKey(employeeId, date);
    if (shiftId === undefined) map.delete(key);
    else map.set(key, { employeeId, date, shiftId });
    return [...map.values()];
  });
  const getCell = (employeeId, day) => {
    const row = entries.find((x) => Number(x.employeeId) === Number(employeeId) && Number(x.date.slice(-2)) === day && x.date.slice(0, 7) === month);
    return !row ? '' : row.shiftId == null ? 'OFF' : String(row.shiftId);
  };
  const duplicatePrevious = async () => {
    const [year, monthNumber] = month.split('-').map(Number);
    const visibleIds = new Set(visibleEmployees.map((employee) => Number(employee.employeeId)));
    if (!visibleEmployees.length) {
      notify('Tidak ada karyawan pada filter divisi yang dipilih.', 'error');
      return;
    }

    const previousMonth = new Date(year, monthNumber - 2, 1);
    const previousKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
    let previousRows;
    try {
      previousRows = await getJadwalByMonth(previousMonth.getFullYear(), previousMonth.getMonth() + 1);
    } catch (err) {
      notify(err.message || 'Jadwal bulan sebelumnya gagal dimuat.', 'error');
      return;
    }
    const sourceRows = (previousRows || []).filter((entry) =>
      entry.date?.slice(0, 7) === previousKey && visibleIds.has(Number(entry.employeeId))
    );
    if (!sourceRows.length) {
      notify(`Jadwal bulan sebelumnya (${previousKey}) belum tersedia untuk karyawan pada filter ini. Publikasikan jadwal bulan itu dahulu.`, 'error');
      return;
    }

    const sourceDays = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0).getDate();
    const byEmployeeAndDay = new Map(sourceRows.map((entry) => [
      `${entry.employeeId}|${Number(entry.date.slice(-2))}`,
      entry.shiftId,
    ]));

    const missingEmployees = [];
    const duplicated = visibleEmployees.flatMap((employee) => {
      const employeeHasSource = Array.from({ length: sourceDays }, (_, index) => index + 1)
        .some((day) => byEmployeeAndDay.has(`${employee.employeeId}|${day}`));
      if (!employeeHasSource) {
        missingEmployees.push(employee.fullName);
        return [];
      }
      return days.flatMap((day) => {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const sourceDay = Math.min(day, sourceDays);
        const sourceKey = `${employee.employeeId}|${sourceDay}`;
        return byEmployeeAndDay.has(sourceKey)
          ? [{ employeeId: employee.employeeId, date, shiftId: byEmployeeAndDay.get(sourceKey) }]
          : [];
      });
    });

    if (!duplicated.length) {
      notify('Tidak ada jadwal bulan sebelumnya yang dapat disalin.', 'error');
      return;
    }

    const replaceIds = new Set(visibleEmployees.map((employee) => Number(employee.employeeId)));
    setEntries((current) => [
      ...current.filter((entry) => !(entry.date.slice(0, 7) === month && replaceIds.has(Number(entry.employeeId)))),
      ...duplicated,
    ]);
    notify(missingEmployees.length
      ? `Jadwal ${previousKey} disalin. Data bulan sebelumnya tidak ditemukan untuk: ${missingEmployees.join(', ')}.`
      : `Jadwal bulan ${previousKey} berhasil disalin ke ${month}. Periksa jadwal lalu publikasikan.`, missingEmployees.length ? 'error' : 'success');
  };
  const generateEntries = async () => {
    const [y, m] = month.split('-').map(Number);
    if (!visibleEmployees.length) { notify('Tidak ada karyawan aktif pada divisi Non Regular (Shift) yang dipilih.', 'error'); return null; }
    const missingShiftEmployees = visibleEmployees.filter((employee) => employeeShifts(employee).length === 0);
    if (missingShiftEmployees.length) {
      const names = [...new Set(missingShiftEmployees.map((employee) => divisionFor(employee)?.namaDivisi || 'Divisi tanpa nama'))];
      notify(`Shift untuk ${names.join(', ')} belum terhubung ke jadwal. Buka Kelola Divisi, edit divisi, lalu klik Simpan Perubahan.`, 'error');
      return null;
    }
    let holidayKeys;
    try {
      const result = await getHolidaysByMonth(y, m, { silent: true });
      holidayKeys = new Set((result?.data || result || []).map((holiday) => holiday.date));
    } catch (err) {
      notify(err.message || 'Hari libur nasional gagal dimuat; jadwal tidak dibuat.', 'error');
      return null;
    }
    const next = [];
    visibleEmployees.forEach((emp, row) => {
      let monthlyHours = 0;
      let assignedWorkdays = 0;
      const assignedShifts = employeeShifts(emp);
      const weeks = new Map();
      days.forEach((day) => {
        const date = new Date(y, m - 1, day);
        const monday = new Date(y, m - 1, day - ((date.getDay() + 6) % 7));
        const weekKey = `${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
        if (!weeks.has(weekKey)) weeks.set(weekKey, []);
        weeks.get(weekKey).push(day);
      });
      [...weeks.values()].forEach((weekDays, weekIndex) => {
        const availableDays = weekDays.filter((day) => !holidayKeys.has(`${month}-${String(day).padStart(2, '0')}`));
        const offset = availableDays.length ? (row + weekIndex) % availableDays.length : 0;
        const rotatedDays = availableDays.map((_, index) => availableDays[(index + offset) % availableDays.length]);
        const assignments = new Map();
        let weeklyHours = 0;
        let weeklyWorkdays = 0;
        rotatedDays.forEach((day) => {
          if (weeklyWorkdays >= Math.max(0, weekDays.length - 1)) return;
          const shift = assignedShifts[(row + Math.floor(assignedWorkdays / 2)) % assignedShifts.length];
          const hours = timeHours(shift);
          if (weeklyHours + hours > 40 || monthlyHours + hours > 160) return;
          assignments.set(day, shift);
          weeklyHours += hours;
          monthlyHours += hours;
          weeklyWorkdays += 1;
          assignedWorkdays += 1;
        });
        weekDays.forEach((day) => {
          const dateKey = `${month}-${String(day).padStart(2, '0')}`;
          const shift = assignments.get(day);
          next.push({ employeeId: emp.employeeId, date: dateKey, shiftId: shift ? shift.shiftId : null });
        });
      });
    });
    return next;
  };
  const generate = async () => {
    const next = await generateEntries();
    if (!next) return;
    const replaceIds = new Set(visibleEmployees.map((employee) => Number(employee.employeeId)));
    setEntries((prev) => [...prev.filter((x) => x.date.slice(0, 7) !== month || !replaceIds.has(Number(x.employeeId))), ...next]);
    notify('Jadwal dibuat dengan batas 40 jam per minggu, maksimal 160 jam per bulan, libur mingguan, dan rotasi shift.', 'success');
  };
  const hasFairShiftRotation = (schedule) => visibleEmployees.every((employee) => {
    const shiftsForEmployee = employeeShifts(employee);
    if (shiftsForEmployee.length < 2) return false;
    const counts = shiftsForEmployee.map((shift) => schedule.filter((entry) =>
      Number(entry.employeeId) === Number(employee.employeeId)
      && Number(entry.shiftId) === Number(shift.shiftId)
    ).length);
    return Math.max(...counts) - Math.min(...counts) <= 2;
  });
  const publish = async () => {
    if (!visibleEmployees.length) return notify('Tidak ada karyawan aktif pada divisi Non Regular (Shift) yang dipilih.', 'error');
    const selectedIds = new Set(visibleEmployees.map((employee) => Number(employee.employeeId)));
    let current = entries.filter((entry) => entry.date.slice(0, 7) === month && selectedIds.has(Number(entry.employeeId)));
    const expectedEntries = visibleEmployees.length * days.length;
    const currentScheduleMatchesDivision = current.length === expectedEntries && visibleEmployees.every((employee) => {
      const validShiftIds = new Set(employeeShifts(employee).map((shift) => Number(shift.shiftId)));
      const employeeEntries = current.filter((entry) => Number(entry.employeeId) === Number(employee.employeeId));
      return employeeEntries.length === days.length
        && employeeEntries.every((entry) => entry.shiftId == null || validShiftIds.has(Number(entry.shiftId)));
    });
    if (!currentScheduleMatchesDivision) {
      const generated = await generateEntries();
      if (!generated) return;
      current = generated;
      setEntries((prev) => [...prev.filter((entry) => entry.date.slice(0, 7) !== month || !selectedIds.has(Number(entry.employeeId))), ...generated]);
      notify('Jadwal dibuat otomatis. Sedang memublikasikan jadwal shift…', 'success');
    }
    if (!current.length) return notify('Belum ada jadwal untuk dipublikasikan.', 'error');
    if (!hasFairShiftRotation(current)) return notify('Rotasi shift belum merata. Atur kembali agar selisih jumlah shift setiap karyawan maksimal 2 hari.', 'error');
    setBusy(true); try { const result = await publishJadwal(current); notify(`Jadwal dipublikasikan (${result.created || 0} baru, ${result.updated || 0} diperbarui).`, 'success'); await loadMonthEntries(); }
    catch (err) { notify(err.message || 'Jadwal gagal dipublikasikan.', 'error'); } finally { setBusy(false); }
  };
  const resetSchedule = async () => {
    if (!visibleEmployees.length) return notify('Tidak ada karyawan Non Regular pada filter divisi ini.', 'error');
    const [year, monthNumber] = month.split('-').map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(monthNumber)) return notify('Periode bulan tidak valid.', 'error');
    const confirmed = window.confirm(`Reset jadwal Non Regular bulan ${month} untuk ${visibleEmployees.length} karyawan? Jadwal yang sudah dipublikasikan juga akan dihapus.`);
    if (!confirmed) return;
    setBusy(true);
    try {
      const result = await resetJadwal({
        year,
        month: monthNumber,
        employeeIds: visibleEmployees.map((employee) => employee.employeeId),
      });
      const resetIds = new Set(visibleEmployees.map((employee) => Number(employee.employeeId)));
      setEntries((current) => current.filter((entry) => entry.date.slice(0, 7) !== month || !resetIds.has(Number(entry.employeeId))));
      notify(`Jadwal berhasil direset (${result.deleted || 0} data dihapus).`, 'success');
    } catch (err) {
      notify(err.message || 'Jadwal gagal direset.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return <main className="kds-page">
    {standalone && <header className="kds-heading"><h1>Kelola Divisi &amp; Shift</h1><p>Kelola divisi dan susun jadwal bulanan karyawan.</p></header>}
    <nav className="kds-tabs"><button className={tab === 'divisi' ? 'active' : ''} onClick={() => setTab('divisi')}>Kelola Divisi</button><button className={tab === 'jadwal' ? 'active' : ''} onClick={() => setTab('jadwal')}>Jadwal &amp; Shift Karyawan</button></nav>
    {error && <p className="kds-error">{error}</p>}{toast.message && <button type="button" role={toast.type === 'error' ? 'alert' : 'status'} className={`kds-toast kds-toast--${toast.type}`} onClick={() => setToast((current) => ({ ...current, message: '' }))}>{toast.message} ×</button>}
    {tab === 'divisi' ? <section className="kds-division-layout">
      <div className="kds-form-card" ref={formCardRef}><header><h2>{editingId ? 'Edit Divisi & Jam Kerja' : 'Form Divisi Baru'}</h2><p>{editingId ? 'Perbarui sistem kerja dan detail shift divisi.' : 'Lengkapi nama divisi lalu tentukan sistem jam kerjanya.'}</p></header><div className="kds-form-body">
        <label>Nama Divisi / Departemen<input ref={nameInputRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Produksi, Warehouse, Customer Service" /></label>
        <label>Sistem Jam Kerja</label><div className="kds-type"><button className={type === 'REGULAR' ? 'selected regular' : ''} onClick={() => changeType('REGULAR')}><b>Regular</b><small>Senin–Jumat, jam kantor tetap</small></button><button className={type === 'SHIFTING' ? 'selected shifting' : ''} onClick={() => changeType('SHIFTING')}><b>Non Regular (Shift)</b><small>Jam kerja bergilir</small></button></div>
        <h3>Jam Kerja</h3>{type === 'REGULAR' ? <div className="kds-regular">Shift Normal (Office)<b>Senin–Jumat · 08:00–17:00</b></div> : <><div className="kds-shift-mode"><button type="button" className={shiftMode === 'TEMPLATE' ? 'active' : ''} onClick={() => { setShifts(makeShiftTemplate([2, 3, 4].includes(shifts.length) ? shifts.length : 3)); setShiftMode('TEMPLATE'); }}>Template standar</button><button type="button" className={shiftMode === 'CUSTOM' ? 'active' : ''} onClick={() => setShiftMode('CUSTOM')}>Custom</button></div>{shiftMode === 'TEMPLATE' ? <><label>Jumlah Shift<select value={shifts.length} onChange={(event) => { setShifts(makeShiftTemplate(Number(event.target.value))); setShiftMode('TEMPLATE'); }}><option value="2">2 shift · 12 jam</option><option value="3">3 shift · 8 jam</option><option value="4">4 shift · 6 jam</option></select></label><div className="kds-shift-list">{shifts.map((shift, index) => <div className="kds-shift-row" key={index}><input aria-label="Nama shift" value={shift.name} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} /><label>Jam Masuk<input type="time" value={shift.startTime} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, startTime: event.target.value } : item))} /></label><label>Jam Pulang<input type="time" value={shift.endTime} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, endTime: event.target.value } : item))} /></label></div>)}</div><small>Template standar: durasi shift otomatis 12, 8, atau 6 jam.</small></> : <><p className="kds-custom-help">Atur 2–6 shift sesuai kebutuhan perusahaan. Jam antarshift boleh memiliki jeda, tetapi tidak boleh saling bertabrakan; durasi tiap shift maksimal 12 jam.</p><div className="kds-shift-list">{shifts.map((shift, index) => <div className="kds-shift-row" key={index}><input aria-label="Nama shift" value={shift.name} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} /><label>Jam Masuk<input type="time" value={shift.startTime} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, startTime: event.target.value } : item))} /></label><label>Jam Pulang<input type="time" value={shift.endTime} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, endTime: event.target.value } : item))} /></label><button type="button" onClick={() => setShifts((previous) => previous.filter((_, row) => row !== index))} disabled={shifts.length <= 2}>Hapus</button></div>)}</div><button type="button" className="kds-add-shift" onClick={() => setShifts((previous) => [...previous, { name: "Shift " + (previous.length + 1), startTime: "", endTime: "" }])} disabled={shifts.length >= 6}>+ Tambah Shift</button></> }
      </>}
      </div><footer><button className="secondary" onClick={resetForm}><RotateCcw size={14} /> Reset</button><button className="primary" disabled={busy} onClick={saveDivision}><Save size={14} /> {busy ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Simpan Divisi'}</button></footer></div>
      <aside className="kds-preview"><small>PRATINJAU</small><h3>{name || 'Nama divisi'} <span>{type === 'REGULAR' ? 'Regular' : 'Non Regular (Shifting)'}</span></h3>{type === 'REGULAR' ? <p>🔵 Shift Normal (Office) <b>08:00–17:00</b></p> : shifts.map((s, i) => <p key={i}>🟢 {s.name} <b>{s.startTime}–{s.endTime}</b></p>)}<hr/><small>DIVISI TERDAFTAR</small><strong className="kds-count">{divisions.length} <small>divisi</small></strong><p>{divisions.filter((d) => d.tipeDivisi !== 'SHIFTING').length} Regular · {divisions.filter((d) => d.tipeDivisi === 'SHIFTING').length} Shift</p>
        <hr/><small>ATUR SHIFT DIVISI</small>{divisions.filter((d) => d.tipeDivisi === 'SHIFTING').map((d) => <div className="kds-division-config" key={d.id}><span>{d.namaDivisi}<small>{d.shifts?.length || 0} shift</small></span><button type="button" onClick={() => editDivision(d)}>Atur</button></div>)}
      </aside><div className="kds-existing-divisions"><DataDivisi key={divisions.map((d) => `${d.id}:${d.tipeDivisi}:${(d.shifts || []).map((s) => `${s.name}-${s.startTime}-${s.endTime}`).join(",")}`).join("|")} karyawanList={employees} showScheduleBuilder={false} onEditDivisi={editDivision} /></div>
    </section> : <section className="kds-schedule"><header className="kds-schedule-head"><div><h2><CalendarDays size={18}/> Kelola Jadwal &amp; Shift Karyawan</h2><p>Pengaturan jadwal ini khusus untuk karyawan divisi Non Regular (Shift).</p></div><div><button onClick={duplicatePrevious}><Layers3 size={15}/> Duplicate Schedule</button><button onClick={resetSchedule} disabled={busy}><RotateCcw size={15}/> Reset Jadwal</button><button className="primary" onClick={generate}>Terapkan Jadwal Massal</button></div></header><div className="kds-filter"><select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)}><option value="all">Semua Divisi Shift</option>{shiftingDivisions.map((d) => <option value={d.id} key={d.id}>{d.namaDivisi}</option>)}</select><input type="month" value={month} onChange={(e) => setMonth(e.target.value)}/><div className="kds-legend">{shiftLegend.map(({ code, label }) => <span key={code} className={`legend-${code.toLowerCase()}`}>{label}</span>)}<span className="legend-o">O: OFF</span></div></div><div className="kds-table-wrap"><table className="kds-table"><thead><tr><th className="sticky">PEGAWAI</th>{days.map((d) => <th key={d}>{d}</th>)}<th>TOTAL JAM</th><th>TOTAL LIBUR</th></tr></thead><tbody>{visibleEmployees.map((e) => { let hours = 0; let off = 0; return <tr key={e.employeeId}><th className="sticky">{e.fullName}<small>{e.divisi?.namaDivisi || '—'}</small></th>{days.map((d) => { const id = getCell(e.employeeId, d); const shift = shiftFor(id); const code = id === '' ? '' : id === 'OFF' ? 'O' : shift ? shiftColorFor(e, shift) : ''; if (code === 'O') off += 1; else if (shift) hours += timeHours(shift); return <td key={d}><select aria-label={`${e.fullName} tanggal ${d}`} className={`kds-cell ${code ? `tone-${code.toLowerCase()}` : ''}`} value={id} onChange={(ev) => setCell(e.employeeId, `${month}-${String(d).padStart(2, '0')}`, ev.target.value ? Number(ev.target.value) : null)}><option value="">·</option><option value="OFF">O</option>{employeeShifts(e).map((s) => <option key={s.shiftId} value={s.shiftId}>{shiftColorFor(e, s)}</option>)}</select></td>})}<td className={hours > 160 ? 'over' : ''}>{hours}j</td><td>{off}</td></tr>})}</tbody></table></div><footer><p>Rotasi bergilir: maksimal 40 jam per minggu dan 160 jam per bulan, minimal 1 hari libur. Istirahat minimal 30 menit setelah 4 jam kerja. Shift malam 23:00–07:00 memerlukan konsumsi bergizi ≥1.400 kkal dan transportasi antar-jemput khusus pekerja perempuan.</p><button className="publish" disabled={busy} onClick={publish}><Send size={15}/>{busy ? 'Mempublikasikan…' : 'Publish Schedule'}</button></footer></section>}
  </main>;
}
