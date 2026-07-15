import React, { useState, useEffect, useRef } from 'react';
import './LeaveForm.css';

export const hariLiburNasional = [];

const localFormatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

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

/**
 * Bagian: JENIS PERMOHONAN CUTI, DURASI SESI SETENGAH HARI, DARI/SAMPAI TANGGAL
 * (dipecah dari LeaveForm.jsx supaya jadi file tersendiri)
 */
const LeaveTypeDateSection = ({
  leaveType, setleaveType,
  leaveTypeId, setLeaveTypeId,
  jenisCutiOptions = [],
  durasiSesi, setDurasiSesi,
  startDate, setstartDate,
  endDate, setendDate,
  jedaHariKerja,
  dinamisBatasMinStr,
  todayStr,
}) => {
  const [showDariCalendar, setShowDariCalendar] = useState(false);
  const [showSampaiCalendar, setShowSampaiCalendar] = useState(false);

  const today = new Date();
  const [dariViewDate, setDariViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sampaiViewDate, setSampaiViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const dariRef = useRef(null);
  const sampaiRef = useRef(null);

  const isMendesak = leaveType === 'Cuti Urgent' || leaveType === 'Cuti Berduka';

  useEffect(() => {
    if (startDate) {
      const dDate = new Date(startDate);
      setDariViewDate(new Date(dDate.getFullYear(), dDate.getMonth(), 1));
    }
    if (endDate) {
      const sDate = new Date(endDate);
      setSampaiViewDate(new Date(sDate.getFullYear(), sDate.getMonth(), 1));
    }
  }, [startDate, endDate]);

  // PERBAIKAN: jika "Dari Tanggal" diubah menjadi lebih baru dari "Sampai Tanggal"
  // yang sudah dipilih sebelumnya, reset "Sampai Tanggal" agar rentang tidak terbalik.
  useEffect(() => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setendDate('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dariRef.current && !dariRef.current.contains(event.target)) setShowDariCalendar(false);
      if (sampaiRef.current && !sampaiRef.current.contains(event.target)) setShowSampaiCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDate = (item, setDateState, setShowCalendar, minDateStr = null) => {
    const selectedStr = `${item.year}-${String(item.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
    if (minDateStr && new Date(selectedStr) < new Date(minDateStr)) return;
    setDateState(selectedStr);
    setShowCalendar(false);
  };

  const renderMiniCalendar = (viewDate, setViewDate, selectedDateStr, onSelect, minDateStr) => {
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

            // Deteksi Weekend & Tanggal Merah Nasional
            const isWeekendDay = (new Date(item.year, item.month, item.day).getDay() === 0 || new Date(item.year, item.month, item.day).getDay() === 6);
            const isTanggalMerah = hariLiburNasional.includes(itemStr);

            // Tombol di-disable jika melanggar batas minimal kerja ATAU weekend ATAU tanggal merah
            const isDisabled = isMelanggarBatasMin || isWeekendDay || isTanggalMerah;

            return (
              <button
                key={idx} type="button"
                disabled={isDisabled}
                onClick={() => onSelect(item)}
                className={`mini-day-cell ${!item.isCurrentMonth ? 'outside-month' : ''} ${itemStr === selectedDateStr ? 'selected' : ''} ${itemStr === todayStr ? 'today' : ''} ${isWeekendDay ? 'weekend' : ''} ${isTanggalMerah ? 'holiday' : ''}`}
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
        <select
          value={leaveTypeId || ''}
          onChange={(e) => {
            const id = e.target.value;
            const opt = jenisCutiOptions.find(o => String(o.leaveTypeId) === id);
            setLeaveTypeId(id ? Number(id) : null);
            setleaveType(opt ? opt.name : '');
          }}
          className="form-control"
        >
          <option value="">Pilih jenis cuti...</option>
          {jenisCutiOptions.map(opt => (
            <option key={opt.leaveTypeId} value={opt.leaveTypeId}>{opt.name}</option>
          ))}
        </select>
      </div>

      {(leaveType === 'Cuti setengah hari') && (
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
            <input type="text" readOnly value={localFormatDateDisplay(startDate)} onClick={() => setShowDariCalendar(!showDariCalendar)} className="form-control text-input-clickable" placeholder="dd/mm/yyyy" />
            <i className="fa-regular fa-calendar-days input-icon-inside"></i>
          </div>
          {showDariCalendar && (() => {
            const batasMinDariStr = isMendesak ? todayStr : dinamisBatasMinStr;
            return renderMiniCalendar(dariViewDate, setDariViewDate, startDate, (item) => handleSelectDate(item, setstartDate, setShowDariCalendar, batasMinDariStr), batasMinDariStr);
          })()}
        </div>

        <div className="form-group flex-1" ref={sampaiRef} style={{ position: 'relative' }}>
          <label className="form-label">SAMPAI TANGGAL</label>
          <div className="input-with-icon">
            <input type="text" readOnly value={localFormatDateDisplay(endDate)} onClick={() => setShowSampaiCalendar(!showSampaiCalendar)} className="form-control text-input-clickable" placeholder="dd/mm/yyyy" />
            <i className="fa-regular fa-calendar-days input-icon-inside"></i>
          </div>
          {showSampaiCalendar && (() => {
            const batasMinSampaiStr = isMendesak
              ? startDate
              : (new Date(startDate) > new Date(dinamisBatasMinStr) ? startDate : dinamisBatasMinStr);

            return renderMiniCalendar(
              sampaiViewDate, setSampaiViewDate, endDate,
              (item) => handleSelectDate(item, setendDate, setShowSampaiCalendar, batasMinSampaiStr),
              batasMinSampaiStr
            );
          })()}
        </div>
      </div>

      <div className="duration-info-alert">
        Durasi pengajuan: {jedaHariKerja === 0 ? "1 Hari" : `${jedaHariKerja} Hari Kerja`}
      </div>
    </>
  );
};

export default LeaveTypeDateSection;
