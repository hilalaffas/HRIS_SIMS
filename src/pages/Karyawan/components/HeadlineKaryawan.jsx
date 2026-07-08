import React from 'react';
import './HeadlineKaryawan.css';

const HeadlineKaryawan = ({ data = [] }) => {
  
  const exportToCsv = () => {
    if (!data || data.length === 0) {
      alert("Tidak ada data karyawan untuk diekspor.");
      return;
    }

    // 1. Definisikan Header Kolom CSV[cite: 1]
    const csvHeaders = [
      'ID', 
      'Kode Karyawan', 
      'Nama Lengkap', 
      'Posisi', 
      'Role Akses', 
      'Departemen', 
      'Email', 
      'Telepon', 
      'Tanggal Bergabung', 
      'Status'
    ];

// 2. Map data ke dalam baris CSV
    const csvRows = data.map(emp => {
      return [
        emp.id,
        emp.kodeKaryawan,
        `"${emp.nama}"`, // Dibungkus kutip ganda untuk menghindari error jika ada koma di nama
        `"${emp.posisi}"`,
        emp.role,
        `"${emp.departemen}"`,
        emp.email,
        emp.telepon,
        `"${emp.tanggalBergabung}"`,
        emp.status
      ].join(',');
    });

    // 3. Gabungkan Header dan Baris Data
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows
    ].join('\n');

    // 4. Buat file Blob dan trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Data_Karyawan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="headline-container">
      <div className="headline-text">
        <h1>Manajemen Sistem & Karyawan</h1>
        <p>Kelola data direktori karyawan, input cuti backdate, dan pantau log aktivitas.</p>
      </div>
      <button className="btn-export" onClick={exportToCsv}>
        <span className="icon-document">📄</span> Ekspor CSV
      </button>
    </div>
  );
};

export default HeadlineKaryawan;