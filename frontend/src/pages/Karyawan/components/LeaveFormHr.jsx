import React, { useEffect, useMemo, useRef, useState } from 'react';
import Dropdown from '../../../components/Dropdown';
import './LeaveFormHr.css';
import { getLeaveTypes, getApprovers, submitUrgentCuti, getCalendarLeaves } from '../../../services/CutiService';
import { isManagerOrSpv } from '../../../utils/roles';
import { getAllHolidays } from '../../../services/holidayService';

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const toDateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const formatDate = (value) => value ? value.split('-').reverse().join('/') : '';
const isoToday = () => {
  const d = new Date();
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
};
const isFemaleEmployee = (genderValue = '') => ['P', 'F', 'PEREMPUAN', 'FEMALE'].includes(
  String(genderValue).trim().toUpperCase()
);
const isBereavementLeave = (name = '') => String(name).trim().toLowerCase().includes('meninggal');
const isUrgentLeave = (name = '') => {
  const normalized = String(name).trim().toLowerCase();
  return ['cuti urgent', 'cuti berduka'].includes(normalized) || isBereavementLeave(name);
};
const addWorkingDaysInclusive = (startDateStr, totalHariKerja, holidayDates) => {
  if (!startDateStr || totalHariKerja <= 0) return startDateStr;
  let count = 0;
  let lastValidStr = startDateStr;
  const current = new Date(`${startDateStr}T00:00:00`);
  while (count < totalHariKerja) {
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    const key = toDateKey(current.getFullYear(), current.getMonth(), current.getDate());
    if (!isWeekend && !holidayDates.has(key)) {
      count += 1;
      lastValidStr = key;
    }
    if (count >= totalHariKerja) break;
    current.setDate(current.getDate() + 1);
  }
  return lastValidStr;
};
const addMonthsToDateStr = (dateStr, months) => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
};
const countWorkingDays = (startDate, endDate, holidayDates, jenisCuti, isFemale = false, bookedDates = new Set()) => {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const normalized = String(jenisCuti || '').trim().toLowerCase();
  if (normalized === 'cuti setengah hari') {
    const d = new Date(`${startDate}T00:00:00`);
    const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    return d.getDay() !== 0 && d.getDay() !== 6 && !holidayDates.has(key) && !bookedDates.has(key) ? 0.5 : 0;
  }
  if (normalized.includes('melahirkan') && isFemale) {
    return Math.max(0, Math.round((new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000) + 1);
  }
  let total = 0;
  for (const d = new Date(`${startDate}T00:00:00`); d <= new Date(`${endDate}T00:00:00`); d.setDate(d.getDate() + 1)) {
    const key = toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (d.getDay() !== 0 && d.getDay() !== 6 && !holidayDates.has(key) && !bookedDates.has(key)) total += 1;
  }
  return total;
};

const getCalendarDays = (viewDate) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const previousLastDay = new Date(year, month, 0).getDate();
  const days = [];
  for (let day = firstWeekday - 1; day >= 0; day -= 1) days.push({ day: previousLastDay - day, month: month === 0 ? 11 : month - 1, year: month === 0 ? year - 1 : year, isCurrentMonth: false });
  for (let day = 1; day <= lastDay; day += 1) days.push({ day, month, year, isCurrentMonth: true });
  while (days.length < 42) {
    const day = days.length - firstWeekday - lastDay + 1;
    days.push({ day, month: month === 11 ? 0 : month + 1, year: month === 11 ? year + 1 : year, isCurrentMonth: false });
  }
  return days;
};

// [BARU] Konversi label dropdown "DURASI SESI SETENGAH HARI" (sistemnya
// disamakan dengan ApplyCuti.jsx / LeaveTypeDateSection.jsx pada form
// Ajukan Cuti karyawan) ke kode sesi mentah "PAGI"/"SIANG" yang disimpan
// backend (leave_requests.session).
const SESSION_CODE_BY_LABEL = {
  'Setengah Hari (Pagi)': 'PAGI',
  'Setengah Hari (Siang)': 'SIANG',
};

const initialFormState = {
  karyawanId: '',
  leaveTypeId: '',
  // [BARU] Default sesi cuti setengah hari, hanya relevan/terkirim kalau
  // jenis cuti yang dipilih adalah "Cuti Setengah Hari" (lihat isHalfDayLeave).
  durasiSesi: 'Setengah Hari (Pagi)',
  startDate: '',
  endDate: '',
  leaderEmployeeId: '',
  spvEmployeeId: '',
  managerEmployeeId: '',
  alasan: '',
  pekerjaanTertunda: '',
  dicoverOleh: '',
};

const LeaveFormHr = ({ karyawanList, onSubmit }) => {
  const [formData, setFormData] = useState(initialFormState);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaderOptions, setLeaderOptions] = useState([]);
  const [spvOptions, setSpvOptions] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  // [BARU] Loading approver terpisah dari isSubmitting, supaya bisa kasih
  // feedback "Memuat approver..." tiap kali ganti karyawan.
  const [isLoadingApprovers, setIsLoadingApprovers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [holidayDates, setHolidayDates] = useState(() => new Set());
  const [bookedDates, setBookedDates] = useState(() => new Set());
  const [activeDatePicker, setActiveDatePicker] = useState(null);
  const [calendarView, setCalendarView] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const dateFieldsRef = useRef(null);

  // Jenis cuti tidak tergantung karyawan yang dipilih -> cukup diambil sekali di awal.
  useEffect(() => {
    (async () => {
      try {
        const types = await getLeaveTypes();
        setLeaveTypes(types || []);
      } catch (error) {
        console.error('Gagal memuat jenis cuti:', error);
      }
    })();
  }, []);

  useEffect(() => {
    getAllHolidays()
      .then((holidays) => setHolidayDates(new Set((holidays || []).map((holiday) => holiday.date))))
      .catch((error) => console.error('Gagal memuat hari libur:', error));
  }, []);

  useEffect(() => {
    const closeDatePicker = (event) => {
      if (dateFieldsRef.current && !dateFieldsRef.current.contains(event.target)) setActiveDatePicker(null);
    };
    document.addEventListener('mousedown', closeDatePicker);
    return () => document.removeEventListener('mousedown', closeDatePicker);
  }, []);

  // Sinkron dengan form cuti karyawan: tanggal yang sudah dipakai karyawan
  // pada cuti ACC/Dalam Proses tidak boleh dipilih lagi. Endpoint kalender
  // hanya mengembalikan PENDING/APPROVED, sama seperti kalender tim.
  useEffect(() => {
    if (!formData.karyawanId) {
      setBookedDates(new Set());
      return;
    }
    let cancelled = false;
    const loadBookedDates = async () => {
      try {
        const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];
        const responses = await Promise.all(years.map((year) => getCalendarLeaves(year)));
        const dates = new Set();
        responses.flatMap((records) => records || []).forEach((record) => {
          if (String(record?.employee?.employeeId ?? '') !== String(formData.karyawanId)) return;
          const start = String(record.startDate || '').split('T')[0];
          const end = String(record.endDate || '').split('T')[0];
          if (!start || !end) return;
          for (const date = new Date(`${start}T00:00:00`); date <= new Date(`${end}T00:00:00`); date.setDate(date.getDate() + 1)) {
            dates.add(toDateKey(date.getFullYear(), date.getMonth(), date.getDate()));
          }
        });
        if (!cancelled) setBookedDates(dates);
      } catch (error) {
        console.error('Gagal memuat tanggal cuti karyawan:', error);
        if (!cancelled) setBookedDates(new Set());
      }
    };
    loadBookedDates();
    return () => { cancelled = true; };
  }, [formData.karyawanId]);


  // [UBAH] Approver (Leader/SPV/Manager) WAJIB satu divisi dengan karyawan
  // yang dipilih HR (bukan divisi HR yang login) -- jadi daftar approver
  // sekarang di-refetch setiap kali "karyawanId" berubah, dengan mengirim
  // employeeId supaya backend tahu divisi acuannya. Sebelumnya endpoint ini
  // dipanggil sekali di awal TANPA employeeId, jadi yang muncul malah
  // approver satu divisi dengan HR sendiri -> submit selalu gagal ("Approver
  // harus berasal dari divisi yang sama dengan pemohon") kecuali kebetulan
  // HR & karyawan target ada di divisi yang sama.
  useEffect(() => {
    if (!formData.karyawanId) {
      setLeaderOptions([]);
      setSpvOptions([]);
      setManagerOptions([]);
      return;
    }

    let isCancelled = false;
    (async () => {
      setIsLoadingApprovers(true);
      try {
        const [leaders, spvs, managers] = await Promise.all([
          getApprovers('LEADER', formData.karyawanId),
          getApprovers('SPV', formData.karyawanId),
          getApprovers('MANAGER', formData.karyawanId),
        ]);
        if (isCancelled) return;
        setLeaderOptions(leaders || []);
        setSpvOptions(spvs || []);
        setManagerOptions(managers || []);
      } catch (error) {
        if (isCancelled) return;
        console.error('Gagal memuat daftar approver untuk karyawan ini:', error);
        setLeaderOptions([]);
        setSpvOptions([]);
        setManagerOptions([]);
        setErrorMessage('Karyawan ini belum punya divisi, atau tidak ada approver satu divisi. Hubungi Super Admin untuk melengkapi data divisi.');
      } finally {
        if (!isCancelled) setIsLoadingApprovers(false);
      }
    })();

    return () => { isCancelled = true; };
  }, [formData.karyawanId]);

  // Kalau karyawan yang dipilih sendiri berperan Leader/SPV/Manager, cukup
  // pilih approver Manager saja — disamakan dengan aturan backend di
  // LeaveService.createApprovalStepsAutoApproved (dan alur Ajukan Cuti biasa).
  const selectedKaryawan = useMemo(
    () => karyawanList?.find((k) => String(k.employeeId || k.id) === String(formData.karyawanId)),
    [karyawanList, formData.karyawanId]
  );
  const selectedIsApproverLevel = isManagerOrSpv({ jabatan: selectedKaryawan?.user?.roleId?.roleName });

  // [BARU] Deteksi Cuti Setengah Hari dari leaveTypeId yang dipilih --
  // sistemnya disamakan dengan LeaveTypeDateSection.jsx (form Ajukan Cuti
  // karyawan), supaya dropdown "DURASI SESI SETENGAH HARI" (Pagi/Siang)
  // ikut muncul di form Cuti Susulan ini.
  const selectedLeaveType = useMemo(
    () => leaveTypes.find((type) => String(type.leaveTypeId) === String(formData.leaveTypeId)),
    [leaveTypes, formData.leaveTypeId]
  );
  const isHalfDayLeave = String(selectedLeaveType?.name || '').trim().toLowerCase() === 'cuti setengah hari';
  const selectedEmployeeGender = selectedKaryawan?.gender || selectedKaryawan?.jenisKelamin || '';
  const isFemale = isFemaleEmployee(selectedEmployeeGender);
  const normalizedLeaveType = String(selectedLeaveType?.name || '').trim().toLowerCase();
  const isMelahirkan = normalizedLeaveType.includes('melahirkan');
  const isMeninggal = isBereavementLeave(selectedLeaveType?.name);
  const isNikah = normalizedLeaveType.includes('nikah');
  const todayStr = isoToday();
  // Sama persis dengan form karyawan: Urgent/Berduka/Meninggal boleh mulai hari ini;
  // jenis lain mengikuti jeda minimal 5 hari kerja.
  const minStartDate = isUrgentLeave(selectedLeaveType?.name) ? todayStr : addWorkingDaysInclusive(todayStr, 5, new Set());
  const maxEndDate = isHalfDayLeave && formData.startDate
    ? formData.startDate
    : (isMelahirkan && formData.startDate
      ? (isFemale ? addMonthsToDateStr(formData.startDate, 3) : addWorkingDaysInclusive(formData.startDate, 2, holidayDates))
      : (isMeninggal && formData.startDate
        ? addWorkingDaysInclusive(formData.startDate, 2, holidayDates)
        : (isNikah && formData.startDate ? addWorkingDaysInclusive(formData.startDate, 3, holidayDates) : null)));
  const jumlahHariCuti = countWorkingDays(formData.startDate, formData.endDate, holidayDates, selectedLeaveType?.name, isFemale, bookedDates);
  const hasBookedDateInRange = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return false;
    for (const d = new Date(`${formData.startDate}T00:00:00`); d <= new Date(`${formData.endDate}T00:00:00`); d.setDate(d.getDate() + 1)) {
      if (bookedDates.has(toDateKey(d.getFullYear(), d.getMonth(), d.getDate()))) return true;
    }
    return false;
  }, [formData.startDate, formData.endDate, bookedDates]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      // [BARU] Ganti karyawan -> reset pilihan Leader/SPV/Manager lama,
      // karena approver dari karyawan sebelumnya belum tentu valid (beda divisi).
      if (name === 'karyawanId') {
        return { ...prev, karyawanId: value, leaderEmployeeId: '', spvEmployeeId: '', managerEmployeeId: '' };
      }
      return { ...prev, [name]: value };
    });
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.startDate || !formData.endDate) {
      setErrorMessage('Tanggal mulai dan tanggal selesai wajib dipilih.');
      return;
    }
    if (formData.endDate < formData.startDate) {
      setErrorMessage('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }
    if (formData.startDate < minStartDate) {
      setErrorMessage(`Tanggal mulai minimal ${formatDate(minStartDate)} sesuai aturan cuti.`);
      return;
    }
    if (maxEndDate && formData.endDate > maxEndDate) {
      setErrorMessage(`Tanggal selesai maksimal ${formatDate(maxEndDate)} sesuai aturan jenis cuti.`);
      return;
    }
    if (jumlahHariCuti <= 0) {
      setErrorMessage('Rentang tanggal tidak memiliki hari kerja yang bisa diajukan atau tanggalnya sudah terpakai.');
      return;
    }
    if (!selectedIsApproverLevel && (!formData.leaderEmployeeId || !formData.spvEmployeeId)) {
      setErrorMessage('Leader dan SPV wajib dipilih untuk karyawan ini.');
      return;
    }
    if (!formData.managerEmployeeId) {
      setErrorMessage('Manager wajib dipilih.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit langsung ke backend (POST /api/cuti/urgent). Endpoint ini
      // otomatis auto-ACC di sisi server, khusus untuk role HR Admin/Super Admin.
      const created = await submitUrgentCuti({
        karyawanId: formData.karyawanId,
        leaveTypeId: formData.leaveTypeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        alasan: formData.alasan,
        pekerjaanTertunda: formData.pekerjaanTertunda,
        dicoverOleh: formData.dicoverOleh,
        // [BARU] Kirim kode sesi ("PAGI"/"SIANG") HANYA untuk Cuti Setengah
        // Hari -- jenis cuti lain selalu null, konsisten dengan
        // submitCuti()/ApplyCuti.jsx (CutiService.js sudah mendukung field
        // ini di submitUrgentCuti(), tinggal dikirim dari sini).
        session: isHalfDayLeave ? (SESSION_CODE_BY_LABEL[formData.durasiSesi] || 'PAGI') : null,
        leaderEmployeeId: selectedIsApproverLevel ? null : formData.leaderEmployeeId,
        spvEmployeeId: selectedIsApproverLevel ? null : formData.spvEmployeeId,
        managerEmployeeId: formData.managerEmployeeId,
      });

      setFormData(initialFormState);
      // [UBAH] leaveRequestId diteruskan lagi ke parent (sempat hilang saat
      // merge) supaya Karyawan.jsx bisa buka langsung modal Detail dari toast sukses.
      if (onSubmit) onSubmit({ karyawanNama: selectedKaryawan?.fullName, leaveRequestId: created?.leaveRequestId });
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal memproses cuti susulan. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDatePicker = (field) => {
    const value = formData[field];
    if (value) {
      const [year, month] = value.split('-').map(Number);
      setCalendarView(new Date(year, month - 1, 1));
    }
    setActiveDatePicker((current) => current === field ? null : field);
  };

  const chooseDate = (field, day) => {
    const value = toDateKey(day.year, day.month, day.day);
    const minDate = field === 'startDate' ? minStartDate : formData.startDate;
    if (minDate && value < minDate) return;
    if (maxEndDate && field === 'endDate' && value > maxEndDate) return;
    setFormData((current) => ({
      ...current,
      [field]: value,
      ...(field === 'startDate' && current.endDate < value ? { endDate: '' } : {}),
    }));
    setActiveDatePicker(null);
  };

  const renderDatePicker = (field) => {
    if (activeDatePicker !== field) return null;
    const todayKey = todayStr;
    return (
      <div className="superadmin-date-calendar">
        <div className="superadmin-date-calendar__header">
          <strong>{MONTH_NAMES[calendarView.getMonth()]} {calendarView.getFullYear()} <span>⌄</span></strong>
          <div><button type="button" onClick={() => setCalendarView(new Date(calendarView.getFullYear(), calendarView.getMonth() - 1, 1))} aria-label="Bulan sebelumnya">↑</button><button type="button" onClick={() => setCalendarView(new Date(calendarView.getFullYear(), calendarView.getMonth() + 1, 1))} aria-label="Bulan berikutnya">↓</button></div>
        </div>
        <div className="superadmin-date-calendar__weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
        <div className="superadmin-date-calendar__days">
          {getCalendarDays(calendarView).map((day) => {
            const value = toDateKey(day.year, day.month, day.day);
            const isHoliday = holidayDates.has(value);
            const dateObj = new Date(day.year, day.month, day.day);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const isBooked = bookedDates.has(value);
            const minDate = field === 'startDate' ? minStartDate : formData.startDate;
            const disabled = (minDate && value < minDate) || (field === 'endDate' && maxEndDate && value > maxEndDate);
            return <button key={value} type="button" disabled={disabled} onClick={() => chooseDate(field, day)} title={isBooked ? 'Tanggal sudah terpakai pengajuan cuti' : isHoliday ? 'Hari libur nasional' : isWeekend ? 'Akhir pekan' : undefined} className={`${!day.isCurrentMonth ? 'is-outside ' : ''}${isHoliday || isWeekend ? 'is-red-day ' : ''}${isBooked ? 'is-booked ' : ''}${disabled ? 'is-disabled-rule ' : ''}${value === formData[field] ? 'is-selected ' : ''}${value === todayKey ? 'is-today' : ''}`}>{day.day}</button>;
          })}
        </div>
        <div className="superadmin-date-calendar__footer"><button type="button" onClick={() => { setFormData((current) => ({ ...current, [field]: '' })); setActiveDatePicker(null); }}>Clear</button><button type="button" onClick={() => { if (field === 'startDate' && todayKey < minStartDate) return; if (field === 'endDate' && (todayKey < (formData.startDate || minStartDate) || (maxEndDate && todayKey > maxEndDate))) return; setFormData((current) => ({ ...current, [field]: todayKey })); setActiveDatePicker(null); }}>Today</button></div>
      </div>
    );
  };


  return (
    <div className="card_leaveFormHr">
      <div className="header_leaveFormHr">
        <div className="header-title-wrapper_leaveFormHr">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <line x1="8" y1="14" x2="12" y2="14"></line>
            <line x1="8" y1="18" x2="16" y2="18"></line>
          </svg>
          <h2>Formulir Cuti Susulan Karyawan</h2>
        </div>
        <p>Formulir khusus HR untuk mencatat cuti darurat/susulan atas nama karyawan (mis. cuti mendadak karena kabar duka). Pengajuan akan langsung berstatus Disetujui (auto-ACC), tanpa menunggu persetujuan Leader/SPV/Manager.</p>
      </div>

      <form className="body_leaveFormHr" onSubmit={handleSubmit}>
        <div className="form-grid_leaveFormHr">
          <div className="form-group_leaveFormHr">
            <label>PILIH KARYAWAN *</label>
            <Dropdown
              name="karyawanId"
              value={formData.karyawanId}
              onChange={handleInputChange}
              options={(karyawanList || []).map(k => ({
                value: k.employeeId || k.id,
                label: `${k.fullName} (${k.nikKaryawan})`,
              }))}
              placeholder="Pilih..."
              required
              searchable
            />
          </div>
          <div className="form-group_leaveFormHr">
            <label>JENIS PERMOHONAN CUTI *</label>
            <Dropdown
              name="leaveTypeId"
              value={formData.leaveTypeId}
              onChange={handleInputChange}
              options={leaveTypes.map((type) => ({ value: type.leaveTypeId, label: type.name }))}
              placeholder="Pilih..."
              required
            />
          </div>
        </div>

        {/* [BARU] Muncul hanya untuk "Cuti Setengah Hari" -- sistemnya sama
            dengan LeaveTypeDateSection.jsx pada form Ajukan Cuti karyawan. */}
        {isHalfDayLeave && (
          <div className="form-group_leaveFormHr">
            <label>DURASI SESI SETENGAH HARI *</label>
            <Dropdown
              name="durasiSesi"
              value={formData.durasiSesi}
              onChange={handleInputChange}
              options={[
                { value: 'Setengah Hari (Pagi)', label: 'Setengah Hari (Pagi: 08.00 - 12.00)' },
                { value: 'Setengah Hari (Siang)', label: 'Setengah Hari (Siang: 13.00 - 17.00)' },
              ]}
              placeholder="Pilih..."
              required
            />
          </div>
        )}

        <div className="form-grid_leaveFormHr" ref={dateFieldsRef}>
          <div className="form-group_leaveFormHr superadmin-date-field">
            <label>DARI TANGGAL (BEBAS)</label>
            <button type="button" className="superadmin-date-field__input" onClick={() => showDatePicker('startDate')}><span>{formatDate(formData.startDate) || 'dd/mm/yyyy'}</span><svg className="superadmin-date-field__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="1"/><path d="M8 3v4M16 3v4M4 10h16"/></svg></button>
            {renderDatePicker('startDate')}
          </div>
          <div className="form-group_leaveFormHr superadmin-date-field">
            <label>SAMPAI TANGGAL</label>
            <button type="button" className="superadmin-date-field__input" onClick={() => showDatePicker('endDate')}><span>{formatDate(formData.endDate) || 'dd/mm/yyyy'}</span><svg className="superadmin-date-field__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="1"/><path d="M8 3v4M16 3v4M4 10h16"/></svg></button>
            {renderDatePicker('endDate')}
          </div>
        </div>

        {(isMelahirkan || isMeninggal || isNikah) && (
          <div className="duration-info-alert">
            {isMelahirkan
              ? (isFemale ? 'Cuti melahirkan untuk karyawan perempuan maksimal 3 bulan sejak tanggal mulai.' : 'Cuti melahirkan (pendamping) untuk karyawan laki-laki maksimal 2 hari kerja. Tanggal merah dan akhir pekan tidak dihitung.')
              : isMeninggal
                ? 'Cuti meninggal dapat diajukan kapan saja, maksimal 2 hari kerja. Tanggal merah dan akhir pekan tidak dihitung, serta tidak memotong cuti tahunan.'
                : 'Cuti nikah maksimal 3 hari kerja. Tanggal merah dan akhir pekan tidak dihitung.'}
          </div>
        )}
        {hasBookedDateInRange && jumlahHariCuti <= 0 && (
          <div className="duration-info-alert duration-info-alert--warning">Tanggal yang dipilih sudah ada pengajuan cuti lain. Silahkan pilih tanggal lain.</div>
        )}
        <div className="duration-info-alert">
          Durasi pengajuan: {jumlahHariCuti} {isMelahirkan && isFemale ? 'Hari' : 'Hari Kerja'}
        </div>

        <div className="form-group_leaveFormHr mt-4">
          <label>PILIH ALUR APPROVAL (UNTUK CATATAN) *</label>

          {/* [BARU] Panduan supaya HR pilih karyawan dulu sebelum approver muncul */}
          {!formData.karyawanId && (
            <p className="info-box_leaveFormHr" style={{ marginTop: 8 }}>
              Pilih karyawan terlebih dahulu — daftar Leader/SPV/Manager mengikuti divisi karyawan tersebut.
            </p>
          )}
          {formData.karyawanId && isLoadingApprovers && (
            <p className="info-box_leaveFormHr" style={{ marginTop: 8 }}>Memuat daftar approver...</p>
          )}

          {formData.karyawanId && !isLoadingApprovers && (
            <div className="form-grid-3_leaveFormHr">
              {!selectedIsApproverLevel && (
                <>
                  <div className="sub-group_leaveFormHr">
                    <span className="sub-label_leaveFormHr">Leader</span>
                    <Dropdown
                      name="leaderEmployeeId"
                      value={formData.leaderEmployeeId}
                      onChange={handleInputChange}
                      options={leaderOptions.map((a) => ({ value: a.employeeId, label: a.fullName }))}
                      placeholder="Pilih..."
                    />
                  </div>
                  <div className="sub-group_leaveFormHr">
                    <span className="sub-label_leaveFormHr">SPV</span>
                    <Dropdown
                      name="spvEmployeeId"
                      value={formData.spvEmployeeId}
                      onChange={handleInputChange}
                      options={spvOptions.map((a) => ({ value: a.employeeId, label: a.fullName }))}
                      placeholder="Pilih..."
                    />
                  </div>
                </>
              )}
              <div className="sub-group_leaveFormHr">
                <span className="sub-label_leaveFormHr">Manager</span>
                <Dropdown
                  name="managerEmployeeId"
                  value={formData.managerEmployeeId}
                  onChange={handleInputChange}
                  options={managerOptions.map((a) => ({ value: a.employeeId, label: a.fullName }))}
                  placeholder="Pilih..."
                />
              </div>
            </div>
          )}

          {formData.karyawanId && selectedIsApproverLevel && (
            <p className="info-box_leaveFormHr" style={{ marginTop: 8 }}>
              Karyawan ini berperan sebagai Leader/SPV/Manager, jadi cukup pilih Manager (peer review) saja.
            </p>
          )}
        </div>

        <div className="form-group_leaveFormHr">
          <label>ALASAN / KETERANGAN *</label>
          <input type="text" name="alasan" placeholder="Berikan alasan yang jelas..." value={formData.alasan} onChange={handleInputChange} required />
        </div>

        <div className="form-group_leaveFormHr">
          <label>PEKERJAAN TERTUNDA *</label>
          <input type="text" name="pekerjaanTertunda" placeholder="Jelaskan status pekerjaan yang ditinggalkan..." value={formData.pekerjaanTertunda} onChange={handleInputChange} required />
        </div>

        <div className="form-group_leaveFormHr">
          <label>DICOVER OLEH *</label>
          <input type="text" name="dicoverOleh" placeholder="Nama rekan kerja yang mem-backup..." value={formData.dicoverOleh} onChange={handleInputChange} required />
        </div>

        {errorMessage && (
          <div className="info-box_leaveFormHr" style={{ borderColor: '#f87171', color: '#b91c1c' }}>{errorMessage}</div>
        )}

        <div className="footer-actions_leaveFormHr">
          <button type="submit" className="btn-submit_leaveFormHr" disabled={isSubmitting}>
            {isSubmitting ? 'Memproses...' : 'Proses Cuti Susulan (Auto-ACC)'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveFormHr;
