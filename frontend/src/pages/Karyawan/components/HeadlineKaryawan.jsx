import React from 'react';
import './HeadlineKaryawan.css';

const HeadlineKaryawan = ({ data = [] }) => {
  
  const exportToCsv = () => {
    if (!data || data.length === 0) {
      alert("Tidak ada data karyawan untuk diekspor.");
      return;
    }

    // 1. Definisikan Header Kolom CSV (Bisa disesuaikan urutannya)
    const csvHeaders = [
      'ID', 
      'NIK Karyawan', 
      'Nama Lengkap', 
      'Posisi', 
      'Departemen/Divisi', 
      'Sisa Cuti',
      'Email', 
      'Telepon', 
      'Status'
    ];

    // 2. Fungsi helper untuk memastikan teks yang mengandung koma (,) 
    //    tidak merusak format kolom CSV.
    const escapeCsv = (text) => `"${String(text || '-').replace(/"/g, '""')}"`;

    // 3. Map data ke dalam baris CSV menggunakan struktur backend
    const csvRows = data.map(emp => {
      // Menarik data berdasarkan penamaan atribut dari backend Spring Boot kamu
      const id = emp.employeeId || emp.id || '-';
      const nik = emp.nikKaryawan || '-';
      const nama = emp.fullName || '-';
      const role = emp.user?.roleId?.roleName || 'MEMBER';
      const divisi = emp.divisi?.namaDivisi || 'Umum';
      const sisaCuti = emp.leave || '12';
      const email = emp.email || '-'; 
      const telepon = emp.phone || emp.noTelp || emp.telepon || '-'; 
      const status = emp.isActive ? 'AKTIF' : 'NONAKTIF';

      return [
        id,
        escapeCsv(nik),
        escapeCsv(nama),
        escapeCsv(role),
        escapeCsv(divisi),
        sisaCuti,
        escapeCsv(email),
        escapeCsv(telepon),
        escapeCsv(status)
      ].join(',');
    });

    // 4. Gabungkan Header dan Baris Data
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows
    ].join('\n');

    // 5. Buat file Blob dan trigger download
    // Tambahkan BOM (\uFEFF) agar Excel membaca karakter khusus (UTF-8) dengan benar
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
        <span className="icon-document">
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2 2h12a2 2 0 0 0 2-2 2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2V4a2 2 0 0 0-2-2h-7Zm1.018 8.828a2.34 2.34 0 0 0-2.373 2.13v.008a2.32 2.32 0 0 0 2.06 2.497l.535.059a.993.993 0 0 0 .136.006.272.272 0 0 1 .263.367l-.008.02a.377.377 0 0 1-.018.044.49.49 0 0 1-.078.02 1.689 1.689 0 0 1-.297.021h-1.13a1 1 0 1 0 0 2h1.13c.417 0 .892-.05 1.324-.279.47-.248.78-.648.953-1.134a2.272 2.272 0 0 0-2.115-3.06l-.478-.052a.32.32 0 0 1-.285-.341.34.34 0 0 1 .344-.306l.94.02a1 1 0 1 0 .043-2l-.943-.02h-.003Zm7.933 1.482a1 1 0 1 0-1.902-.62l-.57 1.747-.522-1.726a1 1 0 0 0-1.914.578l1.443 4.773a1 1 0 0 0 1.908.021l1.557-4.773Zm-13.762.88a.647.647 0 0 1 .458-.19h1.018a1 1 0 1 0 0-2H6.647A2.647 2.647 0 0 0 4 13.647v1.706A2.647 2.647 0 0 0 6.647 18h1.018a1 1 0 1 0 0-2H6.647A.647.647 0 0 1 6 15.353v-1.706c0-.172.068-.336.19-.457Z" clip-rule="evenodd"/>
          </svg>
        </span> 
        <span className="btn-text">Ekspor CSV</span>
      </button>
    </div>
  );
};

export default HeadlineKaryawan;