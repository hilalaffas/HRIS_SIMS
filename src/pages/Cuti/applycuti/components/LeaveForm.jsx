import React, { useState, useEffect, useRef } from 'react';

const LeaveForm = ({
  jenisCuti, setJenisCuti,
  durasiSesi, setDurasiSesi,
  dariTanggal, setDariTanggal,
  sampaiTanggal, setSampaiTanggal,
  alasan, setAlasan,
  leaderApproval, setLeaderApproval,
  spvApproval, setSpvApproval,
  managerApproval, setManagerApproval,
  pekerjaanTertunda, setPekerjaanTertunda,
  coverOleh, setCoverOleh,
  jedaHariKerja,
  dinamisBatasMinStr,
  formatDateDisplay,
  handleSubmit,
  isSubmitting,
  canApplyCuti,
  todayStr
}) => {
  const [showDariCalendar, setShowDariCalendar] = useState(false);
  const [showSampaiCalendar, setShowSampaiCalendar] = useState(false);

  const today = new Date();
  const [dariViewDate, setDariViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sampaiViewDate, setSampaiViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const dariRef = useRef(null);
  const sampaiRef = useRef(null);

  // Deteksi status kedaruratan fitur cuti
  const isMendesak = jenisCuti === 'Cuti Urgent' || jenisCuti === 'Cuti Berduka';

// Sinkronisasi fokus bulan kalender berdasarkan perubahan tanggal riil
  useEffect(() => {
    if (dariTanggal) {
      const dDate = new Date(dariTanggal);
      setDariViewDate(new Date(dDate.getFullYear(), dDate.getMonth(), 1));
    }
    if (sampaiTanggal) {
      const sDate = new Date(sampaiTanggal);
      setSampaiViewDate(new Date(sDate.getFullYear(), sDate.getMonth(), 1));
    }
  }, [dariTanggal, sampaiTanggal]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dariRef.current && !dariRef.current.contains(event.target)) setShowDariCalendar(false);
      if (sampaiRef.current && !sampaiRef.current.contains(event.target)) setShowSampaiCalendar(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            const isTombolDisabled = isMelanggarBatasMin;

            return (
              <button
                key={idx} type="button"
                disabled={isTombolDisabled}
                onClick={() => onSelect(item)}
                className={`mini-day-cell ${!item.isCurrentMonth ? 'outside-month' : ''} ${itemStr === selectedDateStr ? 'selected' : ''} ${itemStr === todayStr ? 'today' : ''} ${(new Date(item.year, item.month, item.day).getDay() === 0 || new Date(item.year, item.month, item.day).getDay() === 6) ? 'weekend' : ''}`}
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
    <div className="form-container">
      <div className="form-header">
        <div className="form-header-icon-title">
          <i className="fa-regular fa-calendar-plus header-form-icon"></i>
          <div>
            <h3 className="form-title">Formulir Pengajuan Cuti</h3>
            <p className="form-instruction">Permohonan akan diproses secara berjenjang oleh atasan Anda.</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="form-body">
        <div className="form-group">
          <label className="form-label">JENIS PERMOHONAN CUTI</label>
          <select value={jenisCuti} onChange={(e) => setJenisCuti(e.target.value)} className="form-control">
            <option value="Cuti tahunan">Cuti tahunan</option>
            <option value="Cuti setengah hari">Cuti setengah hari</option>
            <option value="Cuti nikah (Khusus)">Cuti nikah (Khusus)</option>
            <option value="Cuti Berduka">Cuti Berduka</option>
            <option value="Cuti melahirkan (Khusus)">Cuti melahirkan (Khusus)</option>
            <option value="Cuti Urgent">Cuti Urgent</option>
          </select>
        </div>

        {(jenisCuti === 'Cuti setengah hari' ) && (
          <div className="form-group">
            <label className="form-label">DURASI SESI SETENGAH HARI *</label>
            <select 
              value={durasiSesi} 
              onChange={(e) => setDurasiSesi(e.target.value)} 
              className="form-control"
            >
              <option value="Setengah Hari (Pagi)">Setengah Hari (Pagi: 08.00 - 12.00)</option>
              <option value="Setengah Hari (Siang)">Setengah Hari (Siang: 13.00 - 17.00)</option>
            </select>
          </div>
        )}
        
        <div className="form-row">
          <div className="form-group flex-1" ref={dariRef} style={{ position: 'relative' }}>
            <label className="form-label">DARI TANGGAL</label>
            <div className="input-with-icon">
              <input type="text" readOnly value={formatDateDisplay(dariTanggal)} onClick={() => setShowDariCalendar(!showDariCalendar)} className="form-control text-input-clickable" placeholder="dd/mm/yyyy" />
              <i className="fa-regular fa-calendar-days input-icon-inside"></i>
            </div>
            {showDariCalendar && (() => {
              const batasMinDariStr = isMendesak ? todayStr : dinamisBatasMinStr;
              return renderMiniCalendar(dariViewDate, setDariViewDate, dariTanggal, (item) => handleSelectDate(item, setDariTanggal, setShowDariCalendar, batasMinDariStr), batasMinDariStr);
            })()}
          </div>

          <div className="form-group flex-1" ref={sampaiRef} style={{ position: 'relative' }}>
            <label className="form-label">SAMPAI TANGGAL</label>
            <div className="input-with-icon">
              <input type="text" readOnly value={formatDateDisplay(sampaiTanggal)} onClick={() => setShowSampaiCalendar(!showSampaiCalendar)} className="form-control text-input-clickable" placeholder="dd/mm/yyyy" />
              <i className="fa-regular fa-calendar-days input-icon-inside"></i>
            </div>
            {showSampaiCalendar && (() => {
               const batasMinSampaiStr = isMendesak 
                 ? dariTanggal 
                 : (new Date(dariTanggal) > new Date(dinamisBatasMinStr) ? dariTanggal : dinamisBatasMinStr);

               return renderMiniCalendar(
                 sampaiViewDate, 
                 setSampaiViewDate, 
                 sampaiTanggal, 
                 (item) => handleSelectDate(item, setSampaiTanggal, setShowSampaiCalendar, batasMinSampaiStr), 
                 batasMinSampaiStr
               );
            })()}
          </div>
        </div>

        <div className="duration-info-alert">
          Durasi pengajuan: {jedaHariKerja === 0 ? "1 Hari" : `${jedaHariKerja} Hari Kerja`}
        </div>

        {/* PERBAIKAN 1: Penambahan atribut 'required' agar alur berjenjang wajib diisi oleh user */}
        <div className="form-group">
          <label className="form-label">PILIH ALUR APPROVAL CUTI *</label>
          <div className="approval-row">
            <div className="approval-col">
              <span className="badge-approval leader">Leader</span>
              <select value={leaderApproval} onChange={(e) => setLeaderApproval(e.target.value)} className="form-control" required>
                <option value="">Pilih...</option>
                <option value="None">None</option>
                <option value="Aden">Aden</option>
                <option value="Ari">Ari</option>
                <option value="Guntur">Guntur</option>
                <option value="Jasmin">Jasmin</option>
              </select>
            </div>
            <div className="approval-col">
              <span className="badge-approval spv">SPV</span>
              <select value={spvApproval} onChange={(e) => setSpvApproval(e.target.value)} className="form-control" required>
                <option value="">Pilih...</option>
                <option value="None">None</option>                
                <option value="Mandala">Mandala</option>
              </select>
            </div>
            <div className="approval-col">
              <span className="badge-approval manager">Manager</span>
              <select value={managerApproval} onChange={(e) => setManagerApproval(e.target.value)} className="form-control" required>
                <option value="">Pilih...</option>
                <option value="None">None</option>
                <option value="Ade Mulya">Ade Mulya</option>
                <option value="Fuad">Fuad</option>
                <option value="Hendro">Hendro</option>
                <option value="Mery">Mery</option>
                <option value="Nisa">Nisa</option>
              </select>
            </div>
          </div>
        </div>

        {/* PERBAIKAN 2: Mengubah input type="text" menjadi textarea agar sesuai dengan layout kotak isian detail pada gambar */}
        <div className="form-group">
          <label className="form-label">ALASAN / KETERANGAN *</label>
          <textarea rows="3" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Berikan alasan yang jelas..." className="form-control textarea-control" required />
        </div>

        {/* SEBELUMNYA: Gabung menjadi satu textarea */}
        {/* SEKARANG: Dipecah menjadi dua bagian */}
        <div className="form-group">
          <label className="form-label">PEKERJAAN TERTUNDA *</label>
          <textarea 
            rows="2" 
            value={pekerjaanTertunda} 
            onChange={(e) => setPekerjaanTertunda(e.target.value)} 
            placeholder="Sebutkan pekerjaan apa saja yang tertunda..." 
            className="form-control textarea-control" 
            required 
          />
        </div>

        <div className="form-group">
          <label className="form-label">DICOVER OLEH (BACKUP PIC) *</label>
          <input 
            type="text" 
            value={coverOleh} // Catatan: Tambahkan state baru 'coverOleh' di ApplyCuti.js jika ingin dipisah datanya
            onChange={(e) => setCoverOleh(e.target.value)} 
            placeholder="Nama rekan kerja yang mem-backup pekerjaan Anda..." 
            className="form-control" 
            required 
          />
        </div>

        <div className="btn-group-right">
          <button type="submit" className="btn btn-submit-dark" disabled={isSubmitting || !canApplyCuti}>
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveForm;