import React, { useEffect, useMemo, useState } from 'react';
import './TableKaryawan.css';

// [BARU] Opsi jumlah data per halaman untuk pagination Direktori Karyawan.
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TableKaryawan = ({ data, currentUserRole, onEdit, lastSyncedAt = null }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  // [BARU] State pagination.
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Ambil daftar jabatan yang unik dari database/props 'data' untuk dropdown dinamis
  //const uniqueJabatan = [...new Set(data.map(emp => emp.position).filter(Boolean))];

  // 2. Buat fungsi filter untuk Search dan Jabatan
  const filteredData = data.filter((emp) => {
    // Cek kecocokan search dengan Nama atau NIK (Abaikan besar/kecil huruf)
    const matchSearch =
      emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.nikKaryawan?.toLowerCase().includes(searchTerm.toLowerCase());

    // Cek kecocokan filter dropdown jabatan
    const matchJabatan = filterJabatan === '' || emp.position === filterJabatan;

    return matchSearch && matchJabatan;
  });

  // [BARU] Reset ke halaman 1 setiap kali pencarian/filter berubah atau
  // jumlah data berubah (mis. ada karyawan baru masuk dari polling live).
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterJabatan, data.length]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pageData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safeCurrentPage, pageSize]);

  const rangeStart = filteredData.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredData.length);

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return (
    <div className="table-card">
      <div className="table-header-controls">
        <div className="table-header-titleRow">
          <h3>Direktori Aktif</h3>
          {/* [BARU] Indikator live-sync, mengikuti pola RiwayatCuti.jsx /
              LeaveHistory.jsx. Hanya tampil kalau parent mengirim prop
              lastSyncedAt. */}
          {lastSyncedAt && (
            <div className="table-sync">
              <span className="table-sync__dot" aria-hidden="true"></span>
              Live
              <span className="table-sync__time">
                &middot; diperbarui {lastSyncedAt.toLocaleTimeString('id-ID')}
              </span>
            </div>
          )}
        </div>
        <div className="filters">
          {/* 3. Dropdown Filter Dinamis */}
          <select 
            className="filter-select" 
            value={filterJabatan} 
            onChange={(e) => setFilterJabatan(e.target.value)}
          >
            <option value="">Semua Jabatan</option>
            <option value="Staff">Staff</option>
            <option value="Leader">Leader</option>
            <option value="SPV">SPV</option>
            <option value="Manager">Manager</option>
            <option value="HRD_Admin">HR Admin</option>
            <option value="HRD_Karyawan">HR Karyawan</option>
          </select>

          {/* [BARU] Dropdown jumlah data per halaman */}
          <select
            className="filter-select"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            aria-label="Jumlah data per halaman"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size} / halaman</option>
            ))}
          </select>
          
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Cari Nama / NIK..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Gunakan class table-scroll-wrapper untuk memastikan tabel di dalam card aman jika dilayar kecil */}
      <div className="table-scroll-wrapper">
        <table className="karyawan-table">
          <thead>
            <tr>
              <th>KARYAWAN</th>
              <th>ROLE AKSES</th>
              <th>JABATAN & DIVISI</th>
              <th>TOTAL CUTI</th>
              <th>STATUS</th>
              <th>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {/* 4. Render menggunakan pageData di sini (hasil filter + pagination) */}
            {pageData.map((emp) => {
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sims-backend-api-61je.onrender.com';
              const photoUrl = emp.photo
                ? (emp.photo.startsWith('http') ? emp.photo : `${API_BASE_URL}/${emp.photo}`)
                : `https://ui-avatars.com/api/?name=${emp.fullName}`;

              return (
                <tr key={emp.employeeId || emp.id}>
                  <td>
                    <div className="employee-info">
                      <img 
                        src={photoUrl} 
                        alt="Profil" 
                        className="avatar-img" 
                        onClick={() => setSelectedPhoto(photoUrl)}
                        style={{ cursor: 'pointer' }}
                        title="Klik untuk memperbesar"
                      />
                      <div>
                        <p className="emp-name">{emp.fullName}</p>
                        <p className="emp-nik">{emp.nikKaryawan}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge-role">{emp.user?.roleId?.roleName || 'MEMBER'}</span></td>
                  <td>
                    <p className="emp-position">{emp.position || 'Staff'}</p>
                    <p className="emp-division">{emp.divisi?.namaDivisi || 'Umum'}</p>
                  </td>
                  <td className="text-center font-bold text-green">{emp.totalRemainingLeave ?? emp.manualLeaveBalance ?? 0}</td>
                  <td>
                    <span className={`badge-status ${!emp.isActive ? 'inactive' : ''}`}>
                      {emp.isActive ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </td>
                  <td>
                   <button className="btn-edit" onClick={() => onEdit(emp)}>
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                       <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                       <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                     </svg>
                     Edit
                   </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* [BARU] Kontrol pagination, hanya tampil kalau ada data pada
          filter/pencarian yang aktif saat ini. */}
      {filteredData.length > 0 && (
        <div className="table-pagination">
          <span className="table-pagination__info">
            Menampilkan {rangeStart}-{rangeEnd} dari {filteredData.length} karyawan
          </span>
          <div className="table-pagination__controls">
            <button
              type="button"
              className="table-pagination__btn"
              onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage === 1}
            >
              Sebelumnya
            </button>
            <span className="table-pagination__page">
              Halaman {safeCurrentPage} dari {totalPages}
            </span>
            <button
              type="button"
              className="table-pagination__btn table-pagination__btn--primary"
              onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage >= totalPages}
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}

      {selectedPhoto && (
        <div className="photo-modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-photo-btn" onClick={() => setSelectedPhoto(null)}>X</button>
            <img src={selectedPhoto} alt="Zoom Profil" className="zoomed-photo" />
          </div>
        </div>
      )}

    </div>
  );
};

export default TableKaryawan;