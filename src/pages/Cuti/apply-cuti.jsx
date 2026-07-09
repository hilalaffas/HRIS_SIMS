import React, { useState, useRef, useEffect } from 'react';
import './apply-cuti.css';

const ApplyCuti = () => {
  const [jenisCuti, setJenisCuti] = useState('Cuti Tahunan');
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [dariTanggal, setDariTanggal] = useState(todayStr);
  const [sampaiTanggal, setSampaiTanggal] = useState(todayStr);
  const [alasan, setAlasan] = useState('');

  const [showDariCalendar, setShowDariCalendar] = useState(false);
  const [showSampaiCalendar, setShowSampaiCalendar] = useState(false);

  const [dariViewDate, setDariViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sampaiViewDate, setSampaiViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const dariRef = useRef(null);
  const sampaiRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dariRef.current && !dariRef.current.contains(event.target)) setShowDariCalendar(false);
      if (sampaiRef.current && !sampaiRef.current.contains(event.target)) setShowSampaiCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateDisplay = (dateStr) => {
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
      const d = totalDaysPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      daysArray.push({ day: d, month: m, year: y, isCurrentMonth: false });
    }

    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push({ day: i, month: month, year: year, isCurrentMonth: true });
    }

    let nextMonthDay = 1;
    while (daysArray.length < 35) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      daysArray.push({ day: nextMonthDay, month: m, year: y, isCurrentMonth: false });
      nextMonthDay++;
    }

    return daysArray.slice(0, 35);
  };

  const handleSelectDate = (item, setDateState, setShowCalendar, minDateStr = null) => {
    const formattedMonth = String(item.month + 1).padStart(2, '0');
    const formattedDay = String(item.day).padStart(2, '0');
    const selectedStr = `${item.year}-${formattedMonth}-${formattedDay}`;

    if (minDateStr && new Date(selectedStr) < new Date(minDateStr)) return;
    
    setDateState(selectedStr);
    setShowCalendar(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ jenisCuti, dariTanggal, sampaiTanggal, alasan });
    alert('Pengajuan Cuti Berhasil Dikirim!');
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
            const itemDate = new Date(item.year, item.month, item.day);
            const isSunday = itemDate.getDay() === 0;
            const isSaturday = itemDate.getDay() === 6;
            
            const formattedMonth = String(item.month + 1).padStart(2, '0');
            const formattedDay = String(item.day).padStart(2, '0');
            const itemStr = `${item.year}-${formattedMonth}-${formattedDay}`;

            const isSelected = itemStr === selectedDateStr;
            const isPast = minDateStr && new Date(itemStr) < new Date(minDateStr);
            const isToday = itemStr === todayStr;

            return (
              <button
                key={idx}
                type="button"
                disabled={!item.isCurrentMonth || isPast}
                onClick={() => onSelect(item)}
                className={`mini-day-cell ${!item.isCurrentMonth ? 'outside-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${(isSunday || isSaturday) ? 'weekend' : ''}`}
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
    <div className="form-wrapper">
      <div className="form-container">
        <div className="form-header">
          <h3 className="form-title">Formulir Pengajuan Cuti</h3>
          <p className="form-instruction">
            Isi formulir dengan benar dan pastikan tanggal tidak bentrok dengan jadwal penting divisi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-group">
            <label className="form-label">Jenis Cuti</label>
            <select value={jenisCuti} onChange={(e) => setJenisCuti(e.target.value)} className="form-control">
              <option value="Cuti Tahunan">Cuti Tahunan</option>
              <option value="Cuti Sakit">Cuti Sakit</option>
              <option value="Cuti Melahirkan">Cuti Melahirkan</option>
              <option value="Cuti Alasan Penting">Cuti Alasan Penting</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group flex-1" ref={dariRef} style={{ position: 'relative' }}>
              <label className="form-label">Dari Tanggal</label>
              <input 
                type="text" 
                readOnly
                value={formatDateDisplay(dariTanggal)}
                onClick={() => setShowDariCalendar(!showDariCalendar)}
                className="form-control text-input-clickable"
                placeholder="Pilih Tanggal"
              />
              {showDariCalendar && renderMiniCalendar(dariViewDate, setDariViewDate, dariTanggal, (item) => handleSelectDate(item, setDariTanggal, setShowDariCalendar, todayStr), todayStr)}
            </div>

            <div className="form-group flex-1" ref={sampaiRef} style={{ position: 'relative' }}>
              <label className="form-label">Sampai Tanggal</label>
              <input 
                type="text" 
                readOnly
                value={formatDateDisplay(sampaiTanggal)}
                onClick={() => setShowSampaiCalendar(!showSampaiCalendar)}
                className="form-control text-input-clickable"
                placeholder="Pilih Tanggal"
              />
              {showSampaiCalendar && renderMiniCalendar(sampaiViewDate, setSampaiViewDate, sampaiTanggal, (item) => handleSelectDate(item, setSampaiTanggal, setShowSampaiCalendar, dariTanggal), dariTanggal)}
            </div>
          </div>

          <div className="duration-alert">
            Durasi pengajuan: 3 hari kerja (tidak termasuk akhir pekan)
          </div>

          <div className="form-group">
            <label className="form-label">Alasan Pengajuan Cuti</label>
            <textarea rows="4" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Tuliskan alasan pengajuan secara jelas..." className="form-control textarea-control" />
          </div>

          <div className="btn-group">
            <button type="submit" className="btn btn-submit">Kirim Pengajuan</button>
            <button type="button" className="btn btn-cancel">Batal</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyCuti;