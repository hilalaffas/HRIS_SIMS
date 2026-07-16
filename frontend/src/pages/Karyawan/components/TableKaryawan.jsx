import React, { useState } from 'react';
import './TableKaryawan.css';

const TableKaryawan = ({ data, currentUserRole, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // 1. Ambil daftar jabatan yang unik dari database/props 'data' untuk dropdown dinamis
  const uniqueJabatan = [...new Set(data.map(emp => emp.position).filter(Boolean))];

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

  return (
    <div className="table-card">
      <div className="table-header-controls">
        <h3>Direktori Aktif</h3>
        <div className="filters">
          {/* 3. Dropdown Filter Dinamis */}
          <select 
            className="filter-select" 
            value={filterJabatan} 
            onChange={(e) => setFilterJabatan(e.target.value)}
          >
            <option value="">Semua Jabatan</option>
            {uniqueJabatan.map((jabatan, index) => (
              <option key={index} value={jabatan}>
                {jabatan}
              </option>
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
              <th>SISA CUTI</th>
              <th>STATUS</th>
              <th>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {/* 4. Render menggunakan filteredData di sini, BUKAN data.map */}
            {filteredData.map((emp) => {
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sims-backend-api-61je.onrender.com';
              const photoUrl = emp.photo ? `${API_BASE_URL}/${emp.photo}` : `https://ui-avatars.com/api/?name=${emp.fullName}`;

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
                  <td className="text-center font-bold text-green">{emp.leave || 12}</td>
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