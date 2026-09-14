import React, { useState } from 'react';
import Dropdown from '../../../components/Dropdown';
import './LogSistem.css';

// [BARU] Opsi jumlah data per halaman untuk dropdown filter (pengganti
// <select> native -- lihat komentar di komponen Dropdown).
const LOG_PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

const LogSistem = ({ logList = [] }) => {
  // State untuk Pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Kalkulasi Pagination
  const totalPages = Math.ceil(logList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = logList.slice(startIndex, startIndex + itemsPerPage);

  // Handler Perubahan
  const handleFilterChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset ke halaman 1 setiap mengganti jumlah filter
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
      
      {/* Trik: Atribut 'key' yang berubah akan men-trigger ulang animasi CSS */}
      <div key={`${currentPage}-${itemsPerPage}`} className="body_log_sistem animate-fade_log_sistem">
        {currentLogs.map((log) => (
          <div 
            key={log.id} 
            className={`log-item_log_sistem ${log.type === 'system' ? 'item-system_log_sistem' : 'item-normal_log_sistem'}`}
          >
            <div className="log-time_log_sistem">
              <span>{log.tanggal}</span>
              <span>{log.jam}</span>
            </div>
            <div className="log-content_log_sistem">
              <strong>{log.aktor}</strong> {log.aksi}
            </div>
          </div>
        ))}

        {logList.length === 0 && (
          <div className="empty-log_log_sistem">Belum ada aktivitas terekam.</div>
        )}
      </div>

      {/* Kontrol Pagination (Hanya tampil jika ada data) */}
      {logList.length > 0 && (
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

export default LogSistem;