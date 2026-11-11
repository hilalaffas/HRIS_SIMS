import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Download, Layers3, RotateCcw, Save, Send, Upload } from 'lucide-react';
import { unzipSync, strFromU8 } from 'fflate';
import DataDivisi from './components/DataDivisi';
import { getAllDivisi, createDivisi, updateDivisi } from '../../services/divisiService';
import { getKaryawanList } from '../../services/karyawanService';
import { getAllShift } from '../../services/shiftService';
import { getJadwalByMonth, publishJadwal, resetJadwal } from '../../services/jadwalService';
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
// [BARU] Shift master yang terpasang pada sebuah divisi, berurutan sesuai pengaturan divisi.
// Fungsi murni: dihitung SEKALI per divisi lewat useMemo, bukan ulang di setiap sel tabel.
const resolveDivisionShifts = (division, masterShifts, shiftById) => (Array.isArray(division?.shifts) ? division.shifts : [])
  .map((detail) => masterShifts.find((shift) =>
    Number(shift.divisionId) === Number(division.id)
    && shift.name === detail.name
    && shift.startTime === detail.startTime
    && shift.endTime === detail.endTime
  ) || shiftById.get(Number(detail.scheduleShiftId)))
  .filter(Boolean);
const shiftHours = (shift) => {
  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  const [endHour, endMinute] = shift.endTime.split(':').map(Number);
  return ((endHour * 60 + endMinute - startHour * 60 - startMinute + 1440) % 1440) / 60;
};
const isValidCustomShiftSet = (configuredShifts) => {
  const durations = configuredShifts.map(shiftHours);
  if (durations.some((hours) => hours <= 0)) return false;
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
const standardShiftCodes = { 2: ['P', 'S'], 3: ['P', 'S', 'M'], 4: ['P', 'S', 'SO', 'M'] };
const codeForIndex = (index) => ['P', 'S', 'SO', 'M', 'X', 'Y'][index] || `SHIFT${index + 1}`;
const codeFromShiftName = (name, index, count) => {
  const normalized = String(name || '').toLowerCase();
  if (normalized.includes('pagi')) return 'P';
  if (normalized.includes('siang')) return 'S';
  if (normalized.includes('sore')) return 'SO';
  if (normalized.includes('malam')) return 'M';
  return count <= 4 ? (standardShiftCodes[count]?.[index] || codeForIndex(index)) : codeForIndex(index);
};
const parseScheduleXlsx = async (file) => {
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const xml = (name) => zip[name] ? strFromU8(zip[name]) : '';
  const workbook = new DOMParser().parseFromString(xml('xl/workbook.xml'), 'application/xml');
  const rels = new DOMParser().parseFromString(xml('xl/_rels/workbook.xml.rels'), 'application/xml');
  const target = [...workbook.getElementsByTagName('sheet')].find((sheet) => sheet.getAttribute('name') === 'Jadwal');
  if (!target) throw new Error('File harus memiliki sheet bernama Jadwal.');
  const relation = target.getAttribute('r:id');
  const relationTarget = [...rels.getElementsByTagName('Relationship')].find((item) => item.getAttribute('Id') === relation)?.getAttribute('Target');
  if (!relationTarget) throw new Error('Sheet Jadwal tidak dapat dibaca.');
  const pathParts = ['xl'];
  (relationTarget.startsWith('/') ? relationTarget.slice(1) : relationTarget).split('/').forEach((part) => {
    if (part === '..') pathParts.pop(); else if (part && part !== '.') pathParts.push(part);
  });
  const path = pathParts.join('/');
  const sharedDoc = new DOMParser().parseFromString(xml('xl/sharedStrings.xml'), 'application/xml');
  const shared = [...sharedDoc.getElementsByTagName('si')].map((item) => [...item.getElementsByTagName('t')].map((node) => node.textContent || '').join(''));
  const sheetDoc = new DOMParser().parseFromString(xml(path), 'application/xml');
  return [...sheetDoc.getElementsByTagName('row')].map((row) => {
    const cells = [];
    [...row.getElementsByTagName('c')].forEach((cell) => {
      const ref = cell.getAttribute('r') || '';
      const colName = ref.match(/^[A-Z]+/)?.[0] || 'A';
      const col = [...colName].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
      const valueNode = cell.getElementsByTagName('v')[0];
      let value = valueNode?.textContent || '';
      if (cell.getAttribute('t') === 's') value = shared[Number(value)] || '';
      if (cell.getAttribute('t') === 'inlineStr') value = [...cell.getElementsByTagName('t')].map((node) => node.textContent || '').join('');
      cells[col] = value;
    });
    return cells;
  });
};

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
  const importInputRef = useRef(null);
  const cellRefs = useRef(new Map());
  const [cellDrafts, setCellDrafts] = useState({});
  const scheduleDirtyRef = useRef(false);
  const copiedRangeRef = useRef('');
  const selectionStartRef = useRef(null);
  const [cellSelection, setCellSelection] = useState(null);
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

  // [BARU] Indeks pencarian O(1). Sebelumnya setiap sel tabel memanggil Array.find() pada
  // seluruh jadwal & master shift (karyawan x hari x entri = jutaan perbandingan per render,
  // dan render berulang saat blok sel di-drag). Kini hanya dibangun ulang saat datanya berubah.
  const entriesByKey = useMemo(() => {
    const map = new Map();
    entries.forEach((item) => {
      const key = `${Number(item.employeeId)}|${item.date}`;
      if (!map.has(key)) map.set(key, item); // pertama menang, sama seperti find()
    });
    return map;
  }, [entries]);
  const shiftById = useMemo(() => new Map(masterShifts.map((shift) => [Number(shift.shiftId), shift])), [masterShifts]);
  const divisionById = useMemo(() => new Map(divisions.map((division) => [Number(division.id), division])), [divisions]);
  const divisionShiftsById = useMemo(
    () => new Map(divisions.map((division) => [Number(division.id), resolveDivisionShifts(division, masterShifts, shiftById)])),
    [divisions, masterShifts, shiftById],
  );
  const visibleEmployees = useMemo(() => employees.filter((employee) => {
    if (employee.isActive === false) return false;
    const division = divisionById.get(Number(employee.divisi?.id)) || employee.divisi;
    if (String(division?.tipeDivisi || '').toUpperCase() !== 'SHIFTING') return false;
    return divisionFilter === 'all' || String(division?.id) === divisionFilter;
  }), [employees, divisionById, divisionFilter]);

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
    scheduleDirtyRef.current = false;
    getJadwalByMonth(y, m).then((data) => { if (!scheduleDirtyRef.current) setEntries(data || []); }).catch((err) => setError(err.message || 'Jadwal gagal dimuat.'));
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
    if (type === 'SHIFTING' && !isValidCustomShiftSet(shifts)) return notify('Jadwal shift tidak boleh saling bertabrakan dan durasi shift harus lebih dari 0 jam.', 'error');
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

  const shiftFor = (id) => shiftById.get(Number(id)); // [UBAH] O(1)
  const divisionFor = (employee) => divisionById.get(Number(employee.divisi?.id)) || employee.divisi; // [UBAH] O(1)
  const isShiftingEmployee = (employee) => String(divisionFor(employee)?.tipeDivisi || '').toUpperCase() === 'SHIFTING';
  const shiftingDivisions = divisions.filter((division) => String(division.tipeDivisi || '').toUpperCase() === 'SHIFTING');
  const employeeShifts = (employee) => {
    if (!isShiftingEmployee(employee)) return [];
    const division = divisionFor(employee);
    // [UBAH] Pakai hasil cache per divisi; hitung langsung hanya bila divisi belum ada di daftar.
    return divisionShiftsById.get(Number(division.id)) || resolveDivisionShifts(division, masterShifts, shiftById);
  };
  const shiftColorFor = (employee, shift) => {
    const configuredShifts = employeeShifts(employee);
    const index = configuredShifts.findIndex((item) => Number(item.shiftId) === Number(shift.shiftId));
    return codeFromShiftName(shift.name, index, configuredShifts.length);
  };
  const shiftLegend = [...new Map(visibleEmployees.flatMap((employee) => employeeShifts(employee).map((shift) => {
    const code = shiftColorFor(employee, shift);
    return [code, { code, label: `${code}: ${shift.name.toUpperCase()}`, shift }];
  }))).values()].sort((a, b) => {
    const employee = visibleEmployees.find((item) => employeeShifts(item).some((shift) => shiftColorFor(item, shift) === a.code));
    const other = visibleEmployees.find((item) => employeeShifts(item).some((shift) => shiftColorFor(item, shift) === b.code));
    return employeeShifts(employee || {}).findIndex((shift) => shiftColorFor(employee || {}, shift) === a.code)
      - employeeShifts(other || {}).findIndex((shift) => shiftColorFor(other || {}, shift) === b.code);
  });
  const entryKey = (employeeId, date) => `${employeeId}|${date}`;
  const setCell = (employeeId, date, shiftId) => setEntries((prev) => {
    scheduleDirtyRef.current = true;
    const map = new Map(prev.map((x) => [entryKey(x.employeeId, x.date), x]));
    const key = entryKey(employeeId, date);
    if (shiftId === undefined) map.delete(key);
    else map.set(key, { employeeId, date, shiftId });
    return [...map.values()];
  });
  const applyCellCode = (employee, day, rawCode) => {
    const code = String(rawCode ?? '').trim().toUpperCase();
    const date = `${month}-${String(day).padStart(2, '0')}`;
    if (!code) { setCell(employee.employeeId, date, undefined); return true; }
    if (code === 'O') { setCell(employee.employeeId, date, null); return true; }
    const shift = employeeShifts(employee).find((item) => shiftColorFor(employee, item) === code);
    if (!shift) return false;
    setCell(employee.employeeId, date, Number(shift.shiftId));
    return true;
  };
  const setCellDraft = (employeeId, day, value) => setCellDrafts((current) => ({ ...current, [`${employeeId}|${day}`]: value }));
  const commitCellDraft = (employee, day) => {
    const key = `${employee.employeeId}|${day}`;
    if (!Object.prototype.hasOwnProperty.call(cellDrafts, key)) return true;
    const value = cellDrafts[key];
    if (applyCellCode(employee, day, value)) {
      setCellDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
      return true;
    }
    notify(`Kode ${value} tidak valid untuk ${employee.fullName}.`, 'error');
    setCellDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
    return false;
  };
  const pasteCellRange = (startEmployeeIndex, startDay, pasted) => {
    const values = pasted.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map((line) => line.split('\t'));
    let invalid = 0;
    values.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
      const employee = visibleEmployees[startEmployeeIndex + rowIndex];
      const day = startDay + colIndex;
      if (employee && days.includes(day)) {
        const key = `${employee.employeeId}|${day}`;
        if (!applyCellCode(employee, day, value)) invalid += 1;
        else setCellDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
      }
    }));
    scheduleDirtyRef.current = true;
    notify(invalid ? `${invalid} sel berisi kode shift yang tidak valid; sel valid tetap ditempel.` : 'Jadwal berhasil ditempel ke tabel.');
  };
  const copyText = async (text, message) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const helper = document.createElement('textarea'); helper.value = text; helper.style.position = 'fixed'; helper.style.opacity = '0';
        document.body.appendChild(helper); helper.select();
        if (!document.execCommand('copy')) throw new Error('Clipboard tidak tersedia.');
        helper.remove();
      }
      copiedRangeRef.current = text;
      notify(message);
    } catch { notify('Clipboard tidak dapat diakses. Pilih dan salin isi sel secara manual.', 'error'); }
  };
  const copyScheduleCell = (employee, day) => {
    const draftKey = `${employee.employeeId}|${day}`;
    const value = cellDrafts[draftKey] ?? (() => {
      const id = getCell(employee.employeeId, day);
      const shift = id && id !== 'OFF' ? shiftFor(id) : null;
      return id === 'OFF' ? 'O' : shift ? shiftColorFor(employee, shift) : '';
    })();
    copyText(value, `Kode ${value || '(kosong)'} disalin.`);
  };
  const copyScheduleRow = (employee) => copyText(days.map((day) => {
    const draft = cellDrafts[`${employee.employeeId}|${day}`];
    if (draft !== undefined) return draft;
    const id = getCell(employee.employeeId, day);
    const shift = id && id !== 'OFF' ? shiftFor(id) : null;
    return id === 'OFF' ? 'O' : shift ? shiftColorFor(employee, shift) : '';
  }).join('\t'), `Jadwal ${employee.fullName} disalin.`);
  const copyScheduleColumn = (day) => copyText(visibleEmployees.map((employee) => {
    const draft = cellDrafts[`${employee.employeeId}|${day}`];
    if (draft !== undefined) return draft;
    const id = getCell(employee.employeeId, day);
    const shift = id && id !== 'OFF' ? shiftFor(id) : null;
    return id === 'OFF' ? 'O' : shift ? shiftColorFor(employee, shift) : '';
  }).join('\n'), `Jadwal tanggal ${day} disalin.`);
  const scheduleCodeAt = (employee, day) => {
    const draft = cellDrafts[`${employee.employeeId}|${day}`];
    if (draft !== undefined) return draft;
    const id = getCell(employee.employeeId, day);
    const shift = id && id !== 'OFF' ? shiftFor(id) : null;
    return id === 'OFF' ? 'O' : shift ? shiftColorFor(employee, shift) : '';
  };
  const handleCellCopy = (event, employeeIndex, day) => {
    if (cellSelection && (cellSelection.startEmployee !== cellSelection.endEmployee || cellSelection.startDay !== cellSelection.endDay)) {
      const minRow = Math.min(cellSelection.startEmployee, cellSelection.endEmployee);
      const maxRow = Math.max(cellSelection.startEmployee, cellSelection.endEmployee);
      const minDay = Math.min(cellSelection.startDay, cellSelection.endDay);
      const maxDay = Math.max(cellSelection.startDay, cellSelection.endDay);
      const text = visibleEmployees.slice(minRow, maxRow + 1).map((employee) => days.filter((d) => d >= minDay && d <= maxDay).map((d) => scheduleCodeAt(employee, d)).join('\t')).join('\n');
      event.clipboardData.setData('text/plain', text);
      copiedRangeRef.current = text;
      event.preventDefault();
      notify('Rentang jadwal disalin.');
      return;
    }
    const value = scheduleCodeAt(visibleEmployees[employeeIndex], day);
    event.clipboardData.setData('text/plain', value);
    copiedRangeRef.current = value;
    event.preventDefault();
    notify(`Kode ${value || '(kosong)'} disalin.`);
  };
  const exportSchedule = async () => {
    try {
      const { default: writeXlsxFile } = await import('write-excel-file/browser');
      // Jumlah kolom tanggal harus sama dengan hari pada bulan yang sedang dipilih.
      const scheduleColumnCount = 2 + days.length;
      const scheduleRows = [
      [{ value: `Jadwal Shift ${month}`, type: String, fontWeight: 'bold', columnSpan: scheduleColumnCount }, ...Array(scheduleColumnCount - 1).fill(null)],
      [{ value: 'Kode shift: ' + [...shiftLegend.map((item) => `${item.code} = ${item.shift.name} (${item.shift.startTime}–${item.shift.endTime})`), 'O = OFF'].join(' | '), type: String, columnSpan: scheduleColumnCount }, ...Array(scheduleColumnCount - 1).fill(null)],
      ['ID Karyawan', 'Nama Karyawan', ...days.map(String)].map((value) => ({ value, type: String, fontWeight: 'bold', backgroundColor: '#e2e8f0' })),
        ...visibleEmployees.map((employee) => [
          { value: String(employee.employeeId), type: String },
          { value: employee.fullName, type: String },
          ...days.map((day) => {
            const id = getCell(employee.employeeId, day);
            const shift = id && id !== 'OFF' ? shiftFor(id) : null;
            const value = id === 'OFF' ? 'O' : shift ? shiftColorFor(employee, shift) : '';
            return { value, type: String, backgroundColor: value === 'O' ? '#eff6ff' : '#ffffff' };
          }),
        ]),
      ];
      const legendRows = [['Kode', 'Keterangan shift', 'Jam masuk', 'Jam pulang'], ...[...new Map(visibleEmployees.flatMap((employee) => employeeShifts(employee).map((shift) => [shiftColorFor(employee, shift), { code: shiftColorFor(employee, shift), shift }]))).values()].map(({ code, shift }) => [code, shift.name, shift.startTime, shift.endTime]), ['O', 'OFF / Libur', '-', '-']];
      const blob = await writeXlsxFile([
        { sheet: 'Jadwal', data: scheduleRows },
        { sheet: 'Keterangan Shift', data: legendRows.map((row) => row.map((value) => ({ value, type: String }))) },
      ]).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `jadwal_shift_${month}.xlsx`; link.click(); URL.revokeObjectURL(url);
    } catch (err) { notify(err.message || 'File XLSX gagal dibuat.', 'error'); }
  };
  const importSchedule = async (file) => {
    if (!file) return;
    try {
      const rows = await parseScheduleXlsx(file);
      const header = rows.findIndex((row) => String(row[0] || '').trim().toLowerCase() === 'id karyawan');
      if (header < 0) throw new Error('Sheet Jadwal tidak memiliki header ID Karyawan yang valid.');
      const headerRow = rows[header].slice(2).map((value) => String(value ?? '').trim());
      const dayIndexes = new Map(days.map((day) => [String(day), day]));
      const badCells = [];
      const imported = [];
      const employeeById = new Map(visibleEmployees.map((employee) => [String(employee.employeeId), employee]));
      let malformedCell = false;
      const seenEmployees = new Set();
      rows.slice(header + 1).forEach((row) => {
        const employee = employeeById.get(String(row[0] ?? '').trim());
        if (!employee) return;
        if (seenEmployees.has(String(employee.employeeId))) {
          badCells.push(`${employee.fullName}: baris karyawan duplikat`);
          return;
        }
        seenEmployees.add(String(employee.employeeId));
        headerRow.forEach((dayLabel, col) => {
          const day = dayIndexes.get(dayLabel);
          const code = String(row[col + 2] ?? '').trim().toUpperCase();
          if (!day) { if (code) malformedCell = true; return; }
          if (!code) return;
          if (code === 'O') imported.push({ employeeId: employee.employeeId, date: `${month}-${String(day).padStart(2, '0')}`, shiftId: null });
          else {
            const shift = employeeShifts(employee).find((item) => shiftColorFor(employee, item) === code);
            if (shift) imported.push({ employeeId: employee.employeeId, date: `${month}-${String(day).padStart(2, '0')}`, shiftId: Number(shift.shiftId) });
            else badCells.push(`${employee.fullName}, tanggal ${day}: ${code}`);
          }
        });
      });
      visibleEmployees.forEach((employee) => days.forEach((day) => {
        if (!imported.some((entry) => Number(entry.employeeId) === Number(employee.employeeId) && Number(entry.date.slice(-2)) === day)) badCells.push(`${employee.fullName}, tanggal ${day}: kosong`);
      }));
      visibleEmployees.forEach((employee) => { if (!seenEmployees.has(String(employee.employeeId))) badCells.push(`${employee.fullName}: baris karyawan tidak ditemukan`); });
      if (malformedCell) badCells.unshift('Terdapat kode pada kolom tanggal yang tidak valid.');
      if (badCells.length) throw new Error(`Jadwal harus lengkap dan hanya memakai kode shift divisi atau O: ${badCells.slice(0, 8).join('; ')}${badCells.length > 8 ? `; dan ${badCells.length - 8} lainnya` : ''}`);
      const ids = new Set(visibleEmployees.map((employee) => Number(employee.employeeId)));
      scheduleDirtyRef.current = true;
      setEntries((previous) => [...previous.filter((entry) => entry.date.slice(0, 7) !== month || !ids.has(Number(entry.employeeId))), ...imported]);
      notify(`Impor selesai: ${imported.length} sel jadwal dimuat. Periksa lalu publikasikan.`);
    } catch (err) { notify(err.message || 'File jadwal gagal dibaca.', 'error'); }
    finally { if (importInputRef.current) importInputRef.current.value = ''; }
  };
  const getCell = (employeeId, day) => {
    const row = entriesByKey.get(`${Number(employeeId)}|${month}-${String(day).padStart(2, '0')}`); // [UBAH] O(1), bukan entries.find() per sel
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
    if (!currentScheduleMatchesDivision) return notify('Jadwal belum lengkap atau berisi shift yang tidak sesuai. Lengkapi semua tanggal secara manual atau impor file XLS sebelum publikasi.', 'error');
    if (!current.length) return notify('Belum ada jadwal untuk dipublikasikan.', 'error');
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
        <h3>Jam Kerja</h3>{type === 'REGULAR' ? <div className="kds-regular">Shift Normal (Office)<b>Senin–Jumat · 08:00–17:00</b></div> : <><div className="kds-shift-mode"><button type="button" className={shiftMode === 'TEMPLATE' ? 'active' : ''} onClick={() => { setShifts(makeShiftTemplate([2, 3, 4].includes(shifts.length) ? shifts.length : 3)); setShiftMode('TEMPLATE'); }}>Template standar</button><button type="button" className={shiftMode === 'CUSTOM' ? 'active' : ''} onClick={() => setShiftMode('CUSTOM')}>Custom</button></div>{shiftMode === 'TEMPLATE' ? <><label>Jumlah Shift<select value={shifts.length} onChange={(event) => { setShifts(makeShiftTemplate(Number(event.target.value))); setShiftMode('TEMPLATE'); }}><option value="2">2 shift · 12 jam</option><option value="3">3 shift · 8 jam</option><option value="4">4 shift · 6 jam</option></select></label><div className="kds-shift-list">{shifts.map((shift, index) => <div className="kds-shift-row" key={index}><input aria-label="Nama shift" value={shift.name} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} /><label>Jam Masuk<input type="time" value={shift.startTime} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, startTime: event.target.value } : item))} /></label><label>Jam Pulang<input type="time" value={shift.endTime} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, endTime: event.target.value } : item))} /></label></div>)}</div><small>Template standar: durasi shift otomatis 12, 8, atau 6 jam.</small></> : <><p className="kds-custom-help">Atur 2–6 shift sesuai kebutuhan perusahaan. Jam antarshift boleh memiliki jeda, tetapi tidak boleh saling bertabrakan.</p><div className="kds-shift-list">{shifts.map((shift, index) => <div className="kds-shift-row" key={index}><input aria-label="Nama shift" value={shift.name} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, name: event.target.value } : item))} /><label>Jam Masuk<input type="time" value={shift.startTime} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, startTime: event.target.value } : item))} /></label><label>Jam Pulang<input type="time" value={shift.endTime} onChange={(event) => setShifts((previous) => previous.map((item, row) => row === index ? { ...item, endTime: event.target.value } : item))} /></label><button type="button" onClick={() => setShifts((previous) => previous.filter((_, row) => row !== index))} disabled={shifts.length <= 2}>Hapus</button></div>)}</div><button type="button" className="kds-add-shift" onClick={() => setShifts((previous) => [...previous, { name: "Shift " + (previous.length + 1), startTime: "", endTime: "" }])} disabled={shifts.length >= 6}>+ Tambah Shift</button></> }
      </>}
      </div><footer><button className="secondary" onClick={resetForm}><RotateCcw size={14} /> Reset</button><button className="primary" disabled={busy} onClick={saveDivision}><Save size={14} /> {busy ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : 'Simpan Divisi'}</button></footer></div>
      <aside className="kds-preview"><small>PRATINJAU</small><h3>{name || 'Nama divisi'} <span>{type === 'REGULAR' ? 'Regular' : 'Non Regular (Shifting)'}</span></h3>{type === 'REGULAR' ? <p>🔵 Shift Normal (Office) <b>08:00–17:00</b></p> : shifts.map((s, i) => <p key={i}>🟢 {s.name} <b>{s.startTime}–{s.endTime}</b></p>)}<hr/><small>DIVISI TERDAFTAR</small><strong className="kds-count">{divisions.length} <small>divisi</small></strong><p>{divisions.filter((d) => d.tipeDivisi !== 'SHIFTING').length} Regular · {divisions.filter((d) => d.tipeDivisi === 'SHIFTING').length} Shift</p>
        <hr/><small>ATUR SHIFT DIVISI</small>{divisions.filter((d) => d.tipeDivisi === 'SHIFTING').map((d) => <div className="kds-division-config" key={d.id}><span>{d.namaDivisi}<small>{d.shifts?.length || 0} shift</small></span><button type="button" onClick={() => editDivision(d)}>Atur</button></div>)}
      </aside><div className="kds-existing-divisions"><DataDivisi key={divisions.map((d) => `${d.id}:${d.tipeDivisi}:${(d.shifts || []).map((s) => `${s.name}-${s.startTime}-${s.endTime}`).join(",")}`).join("|")} karyawanList={employees} showScheduleBuilder={false} onEditDivisi={editDivision} /></div>
    </section> : <section className="kds-schedule"><header className="kds-schedule-head"><div><h2><CalendarDays size={18}/> Kelola Jadwal &amp; Shift Karyawan</h2><p>Atur jadwal langsung seperti spreadsheet: blok sel dengan drag, lalu Ctrl+C / Ctrl+V.</p></div><div><button onClick={exportSchedule}><Download size={15}/> Export XLS</button><button onClick={() => importInputRef.current?.click()}><Upload size={15}/> Import XLS</button><input ref={importInputRef} type="file" accept=".xlsx,.xls" hidden onChange={(event) => importSchedule(event.target.files?.[0])}/><button onClick={duplicatePrevious}><Layers3 size={15}/> Duplicate Schedule</button><button onClick={resetSchedule} disabled={busy}><RotateCcw size={15}/> Reset Jadwal</button></div></header><div className="kds-filter"><select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)}><option value="all">Semua Divisi Shift</option>{shiftingDivisions.map((d) => <option value={d.id} key={d.id}>{d.namaDivisi}</option>)}</select><input type="month" value={month} onChange={(e) => setMonth(e.target.value)}/><div className="kds-legend">{shiftLegend.map(({ code, label }) => <span key={code} className={`legend-${code.toLowerCase()}`}>{label}</span>)}<span className="legend-o">O: OFF</span></div></div><div className="kds-table-wrap" onMouseUp={() => { selectionStartRef.current = null; }}><table className="kds-table"><thead><tr><th className="sticky">PEGAWAI</th>{days.map((d) => <th key={d}>{d}</th>)}<th>TOTAL JAM</th><th>TOTAL LIBUR</th></tr></thead><tbody>{visibleEmployees.map((e, employeeIndex) => { let hours = 0; let off = 0; return <tr key={e.employeeId}><th className="sticky">{e.fullName}<small>{e.divisi?.namaDivisi || '—'}</small><datalist id={`shift-codes-${e.employeeId}`}><option value="O"/>{employeeShifts(e).map((s) => <option key={s.shiftId} value={shiftColorFor(e, s)}/>)}</datalist></th>{days.map((d) => { const id = getCell(e.employeeId, d); const shift = shiftFor(id); const code = id === '' ? '' : id === 'OFF' ? 'O' : shift ? shiftColorFor(e, shift) : ''; const draftKey = `${e.employeeId}|${d}`; const value = cellDrafts[draftKey] ?? code; const selected = Boolean(cellSelection && employeeIndex >= Math.min(cellSelection.startEmployee, cellSelection.endEmployee) && employeeIndex <= Math.max(cellSelection.startEmployee, cellSelection.endEmployee) && d >= Math.min(cellSelection.startDay, cellSelection.endDay) && d <= Math.max(cellSelection.startDay, cellSelection.endDay)); if (code === 'O') off += 1; else if (shift) hours += timeHours(shift); return <td key={d} className={selected ? 'kds-selected-cell' : ''}><input ref={(node) => { const refKey = `${employeeIndex}|${d}`; if (node) cellRefs.current.set(refKey, node); else cellRefs.current.delete(refKey); }} aria-label={`${e.fullName} tanggal ${d}`} className={`kds-cell ${value ? `tone-${value.toLowerCase()}` : ''}`} value={value} maxLength={8} placeholder="·" list={`shift-codes-${e.employeeId}`} onMouseDown={(ev) => { if (ev.button === 0) { selectionStartRef.current = { employeeIndex, day: d }; setCellSelection({ startEmployee: employeeIndex, endEmployee: employeeIndex, startDay: d, endDay: d }); } }} onMouseEnter={() => { if (selectionStartRef.current) setCellSelection({ startEmployee: selectionStartRef.current.employeeIndex, endEmployee: employeeIndex, startDay: selectionStartRef.current.day, endDay: d }); }} onChange={(ev) => setCellDraft(e.employeeId, d, ev.target.value.toUpperCase())} onBlur={() => commitCellDraft(e, d)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === 'Tab') { ev.preventDefault(); commitCellDraft(e, d); const nextDay = d < days.length ? d + 1 : 1; const nextEmployee = d < days.length ? employeeIndex : Math.min(employeeIndex + 1, visibleEmployees.length - 1); cellRefs.current.get(`${nextEmployee}|${nextDay}`)?.focus(); } }} onCopy={(ev) => handleCellCopy(ev, employeeIndex, d)} onPaste={(ev) => { const pasted = ev.clipboardData.getData('text/plain') || copiedRangeRef.current; if (pasted.includes('\t') || pasted.includes('\n')) { ev.preventDefault(); pasteCellRange(employeeIndex, d, pasted); } else { ev.preventDefault(); const draft = pasted.trim().toUpperCase(); if (applyCellCode(e, d, draft)) notify(`Kode ${draft || '(kosong)'} ditempel.`); else notify(`Kode ${draft} tidak valid untuk ${e.fullName}.`, 'error'); } }} /></td>})}<td className={hours > 160 ? 'over' : ''}>{hours}j</td><td>{off}</td></tr>})}</tbody></table></div><footer><p>Pilih sel, lalu tarik untuk memilih blok. Gunakan Ctrl+C untuk menyalin dan Ctrl+V untuk menempel; kode shift tujuan divalidasi otomatis.</p><button className="publish" disabled={busy} onClick={publish}><Send size={15}/>{busy ? 'Mempublikasikan…' : 'Publish Schedule'}</button></footer></section>}
  </main>;
}
