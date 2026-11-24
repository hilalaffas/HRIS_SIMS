import React, { useMemo, useState } from 'react'; // [UBAH] + useMemo
import Dropdown from '../../../components/Dropdown';
import './LogTable.css'; // [UBAH] sebelumnya LogSistem.css

// [BARU] Opsi jumlah data per halaman untuk dropdown filter (pengganti
// <select> native -- lihat komentar di komponen Dropdown).
const LOG_PAGE_SIZE_OPTIONS = [
  { value: 5, label: '5' }, // [BARU]
  { value: 10, label: '10' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

// [BARU] Filter jenis aktivitas (mis. melihat siapa saja yang sudah login). Cocok dengan field `action` log.
const ACTIVITY_FILTER_OPTIONS = [
  { value: 'all', label: 'Semua aktivitas' },
  { value: 'login', label: 'Login berhasil' },
  { value: 'loginFailed', label: 'Login gagal' },
  { value: 'leave', label: 'Aktivitas cuti' }, // [BARU]
  { value: 'sick', label: 'Aktivitas sakit & izin' }, // [BARU]
];

const FAILED_LOGIN_ACTIONS = ['LOGIN_FAILED', 'LOGIN_BLOCKED', 'ACCOUNT_LOCKED'];

// [BARU] Kode aksi cuti, sakit & izin yang dicatat backend (LeaveController & AttendanceController).
// Kode baru yang berkaitan dengan cuti/sakit cukup ditambahkan ke daftar ini.
const LEAVE_ACTIONS = [
  'CREATE_CUTI', 'CREATE_URGENT_CUTI', 'RESUBMIT_CUTI', 'APPROVE_CUTI',
  'REJECT_CUTI', 'RETURN_CUTI', 'DELETE_CUTI', 'CANCEL_LEAVE_TODAY',
];
const SICK_ACTIONS = [
  'SUBMIT_IZIN', 'UPLOAD_SURAT_DOKTER', 'REVIEW_SURAT_DOKTER',
  'APPROVE_SAKIT', 'REJECT_SAKIT', 'APPROVE_IZIN_TERLAMBAT', 'REJECT_IZIN_TERLAMBAT',
];

const matchesActivityFilter = (log, filter) => {
  if (filter === 'login') return log.action === 'LOGIN';
  if (filter === 'loginFailed') return FAILED_LOGIN_ACTIONS.includes(log.action);
  if (filter === 'leave') return LEAVE_ACTIONS.includes(log.action); // [BARU]
  if (filter === 'sick') return SICK_ACTIONS.includes(log.action); // [BARU]
  return true;
};

// [BARU] Semua kata yang diketik harus ada di salah satu kolom (nama, aktivitas, tanggal, jam).
const matchesSearch = (log, terms) => {
  if (terms.length === 0) return true;
  const haystack = `${log.aktor} ${log.aksi} ${log.tanggal} ${log.jam}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
};

// [UBAH] Komponen ini sebelumnya bernama LogSistem (tab di halaman Karyawan);
// sekarang dipakai halaman sendiri pages/LogSistem/LogSistem.jsx.
// [UBAH] + headerActions: tombol ekspor dari halaman, ditaruh di header kartu (sebelah "Tampilkan").
const LogTable = ({ logList = [], headerActions = null }) => {
  // State untuk Pagination
  const [itemsPerPage, setItemsPerPage] = useState(5); // [UBAH] default tampilan awal 5 (sebelumnya 10)
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState(''); // [BARU] pencarian nama / aktivitas / tanggal
  const [activityFilter, setActivityFilter] = useState('all'); // [BARU] jenis aktivitas

  // [BARU] Daftar yang sudah disaring; pagination di bawah memakai daftar ini (bukan logList penuh).
  const filteredLogs = useMemo(() => {
    const terms = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return logList.filter((log) => matchesActivityFilter(log, activityFilter) && matchesSearch(log, terms));
  }, [logList, searchText, activityFilter]);
  const isFiltering = searchText.trim() !== '' || activityFilter !== 'all';

  // Kalkulasi Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage); // [UBAH] dulu logList.length
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage); // [UBAH] dulu logList.slice

  // Handler Perubahan
  const handleFilterChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset ke halaman 1 setiap mengganti jumlah filter
  };

  // [BARU] Ganti pencarian / filter -> kembali ke halaman 1.
  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
    setCurrentPage(1);
  };

  const handleActivityFilterChange = (e) => {
    setActivityFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="card-wrapper_log_sistem">
      <div className="header_log_sistem">
        <div className="header-title_log_sistem">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <h3>Log Sistem HR Khusus (Read-Only)</h3>
        </div>
        
        <div className="header-right_log_sistem">
        {headerActions}
        {/* Kontrol Filter Jumlah Data */}
        <div className="filter-wrapper_log_sistem">
          <label htmlFor="log-filter">Tampilkan:</label>
          <Dropdown
            id="log-filter"
            value={itemsPerPage}
            onChange={handleFilterChange}
            options={LOG_PAGE_SIZE_OPTIONS}
            variant="pill"
            className="select-filter_log_sistem"
          />
        </div>
        </div>
      </div>
      
      {/* [BARU] Pencarian + filter jenis aktivitas */}
      <div className="toolbar_log_sistem">
        <input
          type="search"
          className="search-input_log_sistem"
          placeholder="Cari nama, aktivitas, atau tanggal..."
          value={searchText}
          onChange={handleSearchChange}
          aria-label="Cari log sistem"
        />
        <Dropdown
          id="log-activity-filter"
          value={activityFilter}
          onChange={handleActivityFilterChange}
          options={ACTIVITY_FILTER_OPTIONS}
          variant="pill"
          className="select-filter_log_sistem"
        />
        {isFiltering && (
          <span className="result-info_log_sistem">
            {filteredLogs.length} dari {logList.length} log
          </span>
        )}
      </div>

      {/* Trik: Atribut 'key' yang berubah akan men-trigger ulang animasi CSS */}
      <div key={`${currentPage}-${itemsPerPage}-${searchText}-${activityFilter}`} className="body_log_sistem animate-fade_log_sistem">
        {currentLogs.map((log) => (
          <div 
            key={log.id} 
            className={`log-item_log_sistem ${log.type === 'system' ? 'item-system_log_sistem' : 'item-normal_log_sistem'}`}
          >
            {/* [UBAH] Tiga kolom terpisah (waktu | aktor | aksi) supaya rata
                dan presisi di semua baris, tidak lagi satu blok teks. */}
            <div className="log-time_log_sistem">
              <span className="log-date_log_sistem">{log.tanggal}</span>
              <span className="log-clock_log_sistem">{log.jam}</span>
            </div>
            <strong className="log-actor_log_sistem" title={log.aktor}>{log.aktor}</strong>
            <span className="log-action_log_sistem">{log.aksi}</span>
          </div>
        ))}

        {logList.length === 0 && (
          <div className="empty-log_log_sistem">Belum ada aktivitas terekam.</div>
        )}
        {logList.length > 0 && filteredLogs.length === 0 && ( // [BARU]
          <div className="empty-log_log_sistem">Tidak ada log yang cocok dengan pencarian.</div>
        )}
      </div>

      {/* Kontrol Pagination (Hanya tampil jika ada data) */}
      {filteredLogs.length > 0 && ( // [UBAH] dulu logList.length
        <div className="pagination_log_sistem">
          <button 
            onClick={handlePrev} 
            disabled={currentPage === 1}
            className="btn-page_log_sistem"
          >
            Sebelumnya
          </button>
          <span className="page-info_log_sistem">
            Halaman {currentPage} dari {totalPages || 1}
          </span>
          <button 
            onClick={handleNext} 
            disabled={currentPage === totalPages}
            className="btn-page_log_sistem"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
};

export default LogTable;
