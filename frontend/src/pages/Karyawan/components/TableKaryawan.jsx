import React, { useState } from 'react';
import './TableKaryawan.css';

const TableKaryawan = ({ data, currentUserRole, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('');
  
  // 1. Tambahkan state untuk mengatur foto mana yang sedang di-zoom
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  return (
    <div className="table-card">
      <div className="table-header-controls">
        <h3>Direktori Aktif</h3>
        <div className="filters">
          <select 
            className="filter-select" 
            value={filterJabatan} 
            onChange={(e) => setFilterJabatan(e.target.value)}
          >
            <option value="">Semua Jabatan</option>
            <option value="Manager">Manager</option>
            <option value="Senior Software Engineer">Senior Software Engineer</option>
            <option value="HR Admin">HR Admin</option>
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

      {/* [BARU] Wrapper agar tabel bisa digeser (scroll) horizontal di layar HP */}
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
          {data.map((emp) => {
            // Definisikan URL foto agar lebih rapi dipanggil
            const photoUrl = emp.photo ? `http://localhost:8080/${emp.photo}` : `https://ui-avatars.com/api/?name=${emp.fullName}`;

            return (
              <tr key={emp.employeeId || emp.id}>
                <td>
                  <div className="employee-info">
                    {/* 2. Tambahkan onClick dan kursor pointer pada gambar */}
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
                <td><span className="badge-status">{emp.isActive ? 'AKTIF' : 'NONAKTIF'}</span></td>
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

      {/* 3. Render Modal Popup jika ada foto yang dipilih */}
      {selectedPhoto && (
        <div className="photo-modal-overlay" onClick={() => setSelectedPhoto(null)}>
          {/* stopPropagation agar saat foto diklik, modal tidak ikut tertutup */}
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