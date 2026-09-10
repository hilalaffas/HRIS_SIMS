import React, { useState, useEffect, useRef } from 'react';
import './LeaveForm.css';

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

// [BARU] Helper untuk batas Cuti Melahirkan.
// [PERBAIKAN] Sebelumnya pakai d.toISOString().slice(0,10) -- ini BUG di
// timezone yang lebih cepat dari UTC (mis. WIB/UTC+7): toISOString()
// mengonversi ke UTC dulu, jadi tanggal lokal bisa "mundur" 1 hari
// (mis. 22/09 lokal jadi 21/09 setelah dikonversi ke UTC). Sekarang format
// manual dari komponen tanggal LOKAL, tanpa konversi timezone sama sekali.
const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const addMonthsToDateStr = (dateStr, months) => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return toLocalDateStr(d);
};
// [UBAH] Sebelumnya addWorkingDaysToDateStr(), dengan variabel lokal
// `dateStr` di dalam while-loop yang menutupi (shadowing) parameter
// `dateStr` di luar. Sekarang addWorkingDaysInclusive() -- nama & parameter
// dirapikan, dan dipakai bersama untuk Cuti Melahirkan (laki-laki), Cuti
// Meninggal, & Cuti Nikah (lihat pemanggilnya di bawah).
const addWorkingDaysInclusive = (startDateStr, totalHariKerja, holidayDates) => {
  if (!startDateStr || totalHariKerja <= 0) return startDateStr;
  let count = 0;
  let lastValidStr = startDateStr;
  const current = new Date(`${startDateStr}T00:00:00`);
  while (count < totalHariKerja) {
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    const key = toLocalDateStr(current);
    const isHoliday = holidayDates.has(key);
    if (!isWeekend && !isHoliday) {
      count++;
      lastValidStr = key;
    }
    if (count >= totalHariKerja) break;
    current.setDate(current.getDate() + 1);
  }
  return lastValidStr;
};
// Laki-laki (cuti pendamping melahirkan) maksimal 2 hari kerja, Perempuan
// maksimal 3 bulan sejak tanggal mulai.
const MATERNITY_MAX_DAYS_MALE = 2;
const MATERNITY_MAX_MONTHS_FEMALE = 3;
const BEREAVEMENT_MAX_DAYS = 2;
// [BARU] Cuti Nikah: maksimal 3 hari kerja, sama untuk semua gender.
const MARRIAGE_MAX_DAYS = 3;

const generate35Days = (viewDate) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysPrevMonth = new Date(year, month, 0).getDate();
  const daysArray = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({ day: totalDaysPrevMonth - i, month: month === 0 ? 11 : month - 1, year: month === 0 ? year - 1 : year, isCurrentMonth: false });
  }
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push({ day: i, month: month, year: year, isCurrentMonth: true });
  }
  let nextMonthDay = 1;
  while (daysArray.length < 35) {
    daysArray.push({ day: nextMonthDay, month: month === 11 ? 0 : month + 1, year: month === 11 ? year + 1 : year, isCurrentMonth: false });
    nextMonthDay++;
  }
  return daysArray;
};

const LeaveTypeDateSection = ({
  jenisCuti, setJenisCuti,
  durasiSesi, setDurasiSesi,
  startDate, setStartDate,
  endDate, setEndDate,
  dinamisBatasMinStr,
  todayStr,
  leaveTypes = [],
  jumlahHariCuti = 0,
  holidayDates,
  isFemale = false,
}) => {
  const safeHolidayDates = holidayDates instanceof Set ? holidayDates : new Set();

  const [showDariCalendar, setShowDariCalendar] = useState(false);
  const [showSampaiCalendar, setShowSampaiCalendar] = useState(false);

  const today = new Date();
  const [dariViewDate, setDariViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sampaiViewDate, setSampaiViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const dariRef = useRef(null);
  const sampaiRef = useRef(null);

  const normalizedLeaveType = String(jenisCuti || '').trim().toLowerCase();
  const isCutiMeninggal = normalizedLeaveType.includes('meninggal');
  const isMendesak = ['cuti urgent', 'cuti berduka'].includes(normalizedLeaveType) || isCutiMeninggal;
  const isHalfDayLeave = normalizedLeaveType === 'cuti setengah hari';
  // [BARU] Deteksi Cuti Melahirkan tanpa terikat suffix nama persis
  // (mis. "Cuti Melahirkan (Khusus)").
  const isMelahirkan = normalizedLeaveType.includes('melahirkan');
  const batasMaxMelahirkanStr = isMelahirkan && startDate
    ? (isFemale
      ? addMonthsToDateStr(startDate, MATERNITY_MAX_MONTHS_FEMALE)
      : addWorkingDaysInclusive(startDate, MATERNITY_MAX_DAYS_MALE, safeHolidayDates))
    : null;
  const batasMaxMeninggalStr = isCutiMeninggal && startDate
    ? addWorkingDaysInclusive(startDate, BEREAVEMENT_MAX_DAYS, safeHolidayDates)
    : null;
  // [BARU] Deteksi Cuti Nikah (mis. "Cuti Nikah", "Cuti Menikah"), flat 3
  // hari KERJA (Sabtu/Minggu & tanggal merah tidak dihitung) tanpa
  // tergantung gender.
  const isNikah = normalizedLeaveType.includes('nikah');
  const batasMaxNikahStr = isNikah && startDate
    ? addWorkingDaysInclusive(startDate, MARRIAGE_MAX_DAYS, safeHolidayDates)
    : null;

  // [UBAH] Sebelumnya 2 buah useEffect yang memanggil setState langsung di
  // body-nya (kena warning eslint react-hooks/set-state-in-effect). Sekarang
  // dipindah ke pola "adjust state during render" ala React docs: setState
  // dipanggil langsung saat render, dijaga perbandingan key supaya cuma
  // jalan sekali tiap kali nilai terkait benar-benar berubah (tidak infinite
  // loop, tidak lewat useEffect).

  // 1) Sinkronisasi bulan yang tampil di mini-calendar mengikuti startDate/endDate.
  const viewDateSyncKey = `${startDate}|${endDate}`;
  const [prevViewDateSyncKey, setPrevViewDateSyncKey] = useState(viewDateSyncKey);
  if (viewDateSyncKey !== prevViewDateSyncKey) {
    setPrevViewDateSyncKey(viewDateSyncKey);
    if (startDate) {
      const dDate = new Date(startDate);
      setDariViewDate(new Date(dDate.getFullYear(), dDate.getMonth(), 1));
    }
    if (endDate) {
      const sDate = new Date(endDate);
      setSampaiViewDate(new Date(sDate.getFullYear(), sDate.getMonth(), 1));
    }
  }

  // 2) Klem endDate: Cuti Setengah Hari harus sama dengan startDate; Cuti
  // Melahirkan, Meninggal, maupun Nikah tidak boleh melewati batas kebijakannya.
  const endDateClampKey = `${isHalfDayLeave}|${startDate}|${isMelahirkan}|${batasMaxMelahirkanStr}|${isCutiMeninggal}|${batasMaxMeninggalStr}|${isNikah}|${batasMaxNikahStr}`;
  const [prevEndDateClampKey, setPrevEndDateClampKey] = useState(endDateClampKey);
  if (endDateClampKey !== prevEndDateClampKey) {
    setPrevEndDateClampKey(endDateClampKey);
    if (isHalfDayLeave && startDate && endDate !== startDate) {
      setEndDate(startDate);
    } else if (isMelahirkan && batasMaxMelahirkanStr && endDate && endDate > batasMaxMelahirkanStr) {
      setEndDate(batasMaxMelahirkanStr);
    } else if (isCutiMeninggal && batasMaxMeninggalStr && endDate && endDate > batasMaxMeninggalStr) {
      setEndDate(batasMaxMeninggalStr);
    } else if (isNikah && batasMaxNikahStr && endDate && endDate > batasMaxNikahStr) {
      setEndDate(batasMaxNikahStr);
    }
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dariRef.current && !dariRef.current.contains(event.target)) setShowDariCalendar(false);
      if (sampaiRef.current && !sampaiRef.current.contains(event.target)) setShowSampaiCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDate = (item, setDateState, setShowCalendar, minDateStr = null, maxDateStr = null) => {
    const selectedStr = `${item.year}-${String(item.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
    if (minDateStr && new Date(selectedStr) < new Date(minDateStr)) return;
    if (maxDateStr && new Date(selectedStr) > new Date(maxDateStr)) return;
    setDateState(selectedStr);
    setShowCalendar(false);
  };

  const renderMiniCalendar = (viewDate, setViewDate, selectedDateStr, onSelect, minDateStr, maxDateStr = null) => {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const days = generate35Days(viewDate);
    return (
      <div className="custom-mini-calendar">
        <div className="calendar-mini-header">
          <span>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
          <div className="calendar-mini-nav">
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>&lt;</button>
            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>&gt;</button>
          </div>
        </div>
        <div className="calendar-mini-weekdays">
          <div className="text-red">Min</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div className="text-red">Sab</div>
        </div>
        <div className="calendar-mini-grid">
          {days.map((item, idx) => {
            const itemStr = `${item.year}-${String(item.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
            const isMelanggarBatasMin = minDateStr && new Date(itemStr) < new Date(minDateStr);
            const isMelanggarBatasMax = maxDateStr && new Date(itemStr) > new Date(maxDateStr);
            const isDisabledDay = isMelanggarBatasMin || isMelanggarBatasMax;
            const isWeekendDay = (new Date(item.year, item.month, item.day).getDay() === 0 || new Date(item.year, item.month, item.day).getDay() === 6);
            const isHolidayDay = safeHolidayDates.has(itemStr);

            return (
              <button
                key={idx} type="button"
                disabled={isDisabledDay}
                onClick={() => onSelect(item)}
                className={`mini-day-cell ${!item.isCurrentMonth ? 'outside-month' : ''} ${itemStr === selectedDateStr ? 'selected' : ''} ${itemStr === todayStr ? 'today' : ''} ${isWeekendDay ? 'weekend' : ''} ${isHolidayDay ? 'holiday' : ''}`}
              >
                {item.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="form-group">
        <label className="form-label">JENIS PERMOHONAN CUTI</label>
        <select value={jenisCuti} onChange={(e) => setJenisCuti(e.target.value)} className="form-control">
          {leaveTypes.map(type => <option key={type.leaveTypeId} value={type.name}>{type.name}</option>)}
        </select>
      </div>

      {isHalfDayLeave && (
        <div className="form-group">
          <label className="form-label">DURASI SESI SETENGAH HARI *</label>
          <select value={durasiSesi} onChange={(e) => setDurasiSesi(e.target.value)} className="form-control">
            <option value="Setengah Hari (Pagi)">Setengah Hari (Pagi: 08.00 - 12.00)</option>
            <option value="Setengah Hari (Siang)">Setengah Hari (Siang: 13.00 - 17.00)</option>
          </select>
        </div>
      )}

      <div className="form-row">
        <div className="form-group flex-1" ref={dariRef} style={{ position: 'relative' }}>
          <label className="form-label">DARI TANGGAL</label>
          <div className="input-with-icon">
            <input type="text" readOnly value={formatDateDisplay(startDate)} onClick={() => setShowDariCalendar(!showDariCalendar)} className="form-control text-input-clickable" placeholder="dd/mm/yyyy" />
            <i className="fa-regular fa-calendar-days input-icon-inside"></i>
          </div>
          {showDariCalendar && (() => {
            const batasMinDariStr = isMendesak ? todayStr : dinamisBatasMinStr;
            return renderMiniCalendar(dariViewDate, setDariViewDate, startDate, (item) => handleSelectDate(item, setStartDate, setShowDariCalendar, batasMinDariStr), batasMinDariStr);
          })()}
        </div>

        <div className="form-group flex-1" ref={sampaiRef} style={{ position: 'relative' }}>
          <label className="form-label">SAMPAI TANGGAL</label>
          <div className="input-with-icon">
            <input type="text" readOnly value={formatDateDisplay(endDate)} onClick={() => setShowSampaiCalendar(!showSampaiCalendar)} className="form-control text-input-clickable" placeholder="dd/mm/yyyy" />
            <i className="fa-regular fa-calendar-days input-icon-inside"></i>
          </div>
          {showSampaiCalendar && (() => {
            const batasMinSampaiStr = startDate;
            const batasMaxSampaiStr = isHalfDayLeave
              ? startDate
              : (isMelahirkan ? batasMaxMelahirkanStr : (isCutiMeninggal ? batasMaxMeninggalStr : (isNikah ? batasMaxNikahStr : null)));

            return renderMiniCalendar(
              sampaiViewDate, setSampaiViewDate, endDate,
              (item) => handleSelectDate(item, setEndDate, setShowSampaiCalendar, batasMinSampaiStr, batasMaxSampaiStr),
              batasMinSampaiStr,
              batasMaxSampaiStr
            );
          })()}
        </div>
      </div>

      {isMelahirkan && (
        <div className="duration-info-alert" style={{ marginTop: '-6px' }}>
          {isFemale
            ? `Cuti melahirkan untuk karyawan perempuan maksimal ${MATERNITY_MAX_MONTHS_FEMALE} bulan sejak tanggal mulai.`
            : `Cuti melahirkan (pendamping) untuk karyawan laki-laki maksimal ${MATERNITY_MAX_DAYS_MALE} hari kerja. Tanggal merah dan akhir pekan tidak dihitung.`}
        </div>
      )}

      {isCutiMeninggal && (
        <div className="duration-info-alert" style={{ marginTop: '-6px' }}>
          Cuti meninggal dapat diajukan kapan saja, maksimal {BEREAVEMENT_MAX_DAYS} hari kerja. Tanggal merah dan akhir pekan tidak dihitung, serta tidak memotong cuti tahunan.
        </div>
      )}

      {/* [BARU] Info alert Cuti Nikah, gaya konsisten dengan Melahirkan & Meninggal di atas. */}
      {isNikah && (
        <div className="duration-info-alert" style={{ marginTop: '-6px' }}>
          {`Cuti nikah maksimal ${MARRIAGE_MAX_DAYS} hari kerja. Tanggal merah dan akhir pekan tidak dihitung.`}
        </div>
      )}

      <div className="duration-info-alert">
        Durasi pengajuan: {jumlahHariCuti} {isMelahirkan && isFemale ? 'Hari' : 'Hari Kerja'}
      </div>
    </>
  );
};

export default LeaveTypeDateSection;
