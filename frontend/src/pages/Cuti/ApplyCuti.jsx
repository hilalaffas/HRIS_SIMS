import React, { useState, useRef, useEffect } from 'react';
import { submitCuti, getRiwayatByUser } from '../../services/cutiService';
import './ApplyCuti.css';

const ApplyCuti = ({ user }) => {
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

  // State Baru untuk Manajemen Filter Riwayat Pengajuan Cuti
  const [filterStatus, setFilterStatus] = useState('Semua Berkas');

  // Riwayat pengajuan diambil dari cutiService (localStorage untuk sekarang)
  const [riwayatCuti, setRiwayatCuti] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mengambil role/jabatan user secara aman (case-insensitive)
  const userRole = (user?.jabatan || user?.role || 'karyawan').toLowerCase();
  
  // Menentukan siapa saja yang BOLEH mengajukan cuti (karyawan, spv, manager, hr admin)
  const canApplyCuti = !userRole.includes('super admin') && userRole !== 'superadmin';

  // Identitas user untuk keperluan simpan & filter riwayat
  const userId = user?.id ?? 'guest';
  const userName = user?.nama || user?.name || 'Karyawan';

  // Mengambil data cuti dari object user di database
  const sisaCutiTahunan = user?.sisa_cuti_tahunan ?? 12; 
  const kuotaCutiPerusahaan = user?.kuota_cuti_bulan_ini ?? 0;
  const tahunBerjalan = today.getFullYear();

  const dariRef = useRef(null);
  const sampaiRef = useRef(null);

  // Ambil riwayat pengajuan milik user ini setiap kali halaman dibuka
  useEffect(() => {
    const loadRiwayat = async () => {
      const data = await getRiwayatByUser(userId);
      setRiwayatCuti(data);
    };
    loadRiwayat();
  }, [userId]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canApplyCuti) {
      alert('Role Anda tidak diizinkan untuk mengajukan cuti.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCuti({
        userId,
        userName,
        jenisCuti,
        dariTanggal,
        sampaiTanggal,
        alasan,
      });

      // Refresh riwayat setelah submit berhasil
      const updatedRiwayat = await getRiwayatByUser(userId);
      setRiwayatCuti(updatedRiwayat);

      setAlasan('');
      alert('Pengajuan Cuti Berhasil Dikirim!');
    } catch (err) {
      console.error('Gagal mengirim pengajuan cuti:', err);
      alert('Terjadi kesalahan, silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
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

  // Logika Filter Data Riwayat Berdasarkan Seleksi Dropdown
  const filteredRiwayat = riwayatCuti.filter((item) => {
    if (filterStatus === 'Semua Berkas') return true;
    return item.status === filterStatus;
  });

  if (!canApplyCuti) {
    return (
      <div className="form-wrapper text-center" style={{ padding: '2rem' }}>
        <div className="form-container" style={{ backgroundColor: '#ffffff', color: '#333', padding: '2rem', borderRadius: '0.5rem', textAlign: 'center' }}>
          <i className="fa-solid fa-circle-xmark" style={{ fontSize: '3rem', color: '#dc2626', marginBottom: '1rem' }}></i>
          <h3>Akses Terbatas</h3>
          <p>Akun dengan role <strong>Super Admin</strong> tidak dapat menggunakan form pengajuan cuti mandiri.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-wrapper">
      {/* KARTU INFORMASI CUTI ATAS */}
      <div className="applycuti-cards-container">
        <div className="applycuti-card total-leave-card">
          <span className="applycuti-card-title">TOTAL SISA CUTI TAHUNAN</span>
          <div className="applycuti-card-value-container">
            <span className="applycuti-card-value">{sisaCutiTahunan}</span>
            <span className="applycuti-card-unit">Hari</span>
          </div>
          <span className="applycuti-card-footer">Dapat digunakan hingga 31 Des {tahunBerjalan}</span>
        </div>

        <div className="applycuti-card quota-leave-card">
          <span className="applycuti-card-title">KUOTA CUTI PERUSAHAAN BULAN INI</span>
          <div className="applycuti-card-value-container">
            <span className="applycuti-card-value dynamic-blue">{kuotaCutiPerusahaan}</span>
            <span className="applycuti-card-unit dark-text">Hari Kerja</span>
          </div>
          <div className="applycuti-card-progress-bar"></div>
        </div>
      </div>

      {/* Kontainer Formulir Utama */}
      <div className="form-container">
        <div className="form-header">
          <div className="form-header-icon-title">
            <i className="fa-regular fa-calendar-plus header-form-icon"></i>
            <div>
              <h3 className="form-title">Formulir Pengajuan Cuti</h3>
              <p className="form-instruction">
                Permohonan akan diproses secara berjenjang oleh atasan Anda.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-group">
            <label className="form-label">JENIS PERMOHONAN CUTI</label>
            <select value={jenisCuti} onChange={(e) => setJenisCuti(e.target.value)} className="form-control">
              <option value="Cuti Tahunan">Cuti tahunan</option>
              <option value="Cuti Sakit">Cuti sakit</option>
              <option value="Cuti Melahirkan">Cuti melahirkan</option>
              <option value="Cuti Alasan Penting">Cuti alasan penting</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group flex-1" ref={dariRef} style={{ position: 'relative' }}>
              <label className="form-label">DARI TANGGAL (MINIMAL HARI INI)</label>
              <div className="input-with-icon">
                <input 
                  type="text" 
                  readOnly
                  value={formatDateDisplay(dariTanggal)}
                  onClick={() => setShowDariCalendar(!showDariCalendar)}
                  className="form-control text-input-clickable"
                  placeholder="mm/dd/yyyy"
                />
                <i className="fa-regular fa-calendar-days input-icon-inside"></i>
              </div>
              {showDariCalendar && renderMiniCalendar(dariViewDate, setDariViewDate, dariTanggal, (item) => handleSelectDate(item, setDariTanggal, setShowDariCalendar, todayStr), todayStr)}
            </div>

            <div className="form-group flex-1" ref={sampaiRef} style={{ position: 'relative' }}>
              <label className="form-label">SAMPAI TANGGAL</label>
              <div className="input-with-icon">
                <input 
                  type="text" 
                  readOnly
                  value={formatDateDisplay(sampaiTanggal)}
                  onClick={() => setShowSampaiCalendar(!showSampaiCalendar)}
                  className="form-control text-input-clickable"
                  placeholder="mm/dd/yyyy"
                />
                <i className="fa-regular fa-calendar-days input-icon-inside"></i>
              </div>
              {showSampaiCalendar && renderMiniCalendar(sampaiViewDate, setSampaiViewDate, sampaiTanggal, (item) => handleSelectDate(item, setSampaiTanggal, setShowSampaiCalendar, dariTanggal), dariTanggal)}
            </div>
          </div>

          <div className="duration-alert">
            Silakan pilih tanggal awal dan akhir.
          </div>

          <div className="form-group">
            <label className="form-label">ALASAN PENGAJUAN CUTI</label>
            <textarea rows="4" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Tuliskan alasan pengajuan secara jelas..." className="form-control textarea-control" />
          </div>

          <div className="btn-group">
            <button type="submit" className="btn btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
            <button type="button" className="btn btn-cancel">Batal</button>
          </div>
        </form>
      </div>

      {/* --- SEKSI TERBARU: RIWAYAT & STATUS PENGAJUAN --- */}
      <div className="history-container">
        <div className="history-header">
          <div className="history-title-container">
            <i className="fa-solid fa-clock-rotate-left history-header-icon"></i>
            <h3 className="history-title">Riwayat & Status Pengajuan</h3>
          </div>
          
          <div className="history-filter-container">
            <span className="filter-label">FILTER:</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="filter-dropdown"
            >
              <option value="Semua Berkas">Semua Berkas</option>
              <option value="Dalam Proses">Dalam Proses</option>
              <option value="Disetujui (ACC)">Disetujui (ACC)</option>
              <option value="Dikemalikan">Dikemalikan</option>
              <option value="DitolaK">DitolaK</option>
            </select>
          </div>
        </div>

        <div className="history-body">
          {filteredRiwayat.length === 0 ? (
            <div className="empty-history-box">
              Belum ada riwayat pengajuan.
            </div>
          ) : (
            <div className="history-list">
              {filteredRiwayat.map((item) => (
                <div key={item.id} className="history-item-card">
                  <div className="history-item-info">
                    <span className="history-item-leave-type">{item.jenisCuti}</span>
                    <span className="history-item-dates">
                      {formatDateDisplay(item.dariTanggal)} s/d {formatDateDisplay(item.sampaiTanggal)}
                    </span>
                    <p className="history-item-reason"><em>"{item.alasan || 'Tidak ada alasan'}"</em></p>
                  </div>
                  <div className={`status-badge ${item.status.toLowerCase().replace(/[^a-z]/g, '')}`}>
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ApplyCuti;