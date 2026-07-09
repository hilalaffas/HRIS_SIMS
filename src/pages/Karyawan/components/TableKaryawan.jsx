import React, { useState } from 'react';
import './TableKaryawan.css';
import ModalDetailKaryawan from './ModalDetailKaryawan';
import { dataMockKaryawan } from '../data/dataMockKaryawan'; // Sesuaikan path folder data Anda

const TableKaryawan = ({ currentUserRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const handleEditClick = (employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

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
              placeholder="Cari Nama / NIK / Divisi..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

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
          {/* Menggunakan dataMockKaryawan */}
          {dataMockKaryawan.map((emp) => (
            <tr key={emp.id}>
              <td>
                <div className="employee-info">
                  <img src={emp.avatar} alt="Foto Profil" className="avatar-img" />
                  <div>
                    <p className="emp-name">{emp.name}</p>
                    <p className="emp-nik">{emp.nik}</p>
                  </div>
                </div>
              </td>
              <td><span className="badge-role">{emp.role}</span></td>
              <td>
                <p className="emp-position">{emp.position}</p>
                <p className="emp-division">{emp.division}</p>
              </td>
              <td className="text-center font-bold text-green">{emp.leave}</td>
              <td><span className="badge-status">AKTIF</span></td>
              <td>
                <button className="btn-edit" onClick={() => handleEditClick(emp)}>
                  ✏️ Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <ModalDetailKaryawan 
          isOpen={isModalOpen} // INI PERBAIKANNYA: Prop isOpen wajib dikirim
          employeeData={selectedEmployee} 
          currentUserRole={currentUserRole}
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default TableKaryawan;