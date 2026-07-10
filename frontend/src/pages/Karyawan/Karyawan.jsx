import React, { useMemo, useState } from 'react';
import './Karyawan.css';
import HeadlineKaryawan from './components/HeadlineKaryawan';
import TabMenuKaryawan from './components/TabMenuKaryawan';
import TableKaryawan from './components/TableKaryawan';
import FormKaryawan from './components/FormKaryawan';
import ModalDetailKaryawan from './components/ModalDetailKaryawan'; // [BARU] Import komponen modal baru
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import { initialKaryawanList } from './data/mockData';
import { isSuperAdmin, isHrAdmin } from '../../utils/roles';
import DataDivisi from './components/DataDivisi';
import LogSistem from './components/LogSistem';
import { initialLogs } from './data/mockLogs'
import LeaveFormHr from './components/LeaveFormHr';
import LeaveListHr from './components/LeaveListHr';
// Sesuaikan nama 'mockDataCuti' dengan nama variabel yang di-export dari mockData.js tersebut
import {allLeaveHistory} from '../Cuti/approve/data/mockData';


const Karyawan = ({ user }) => {
    // 2. Tambahkan state untuk Log
  const [logList, setLogList] = useState(initialLogs);

  // 3. Buat Fungsi Pencatat Aktivitas
  const addLogActivity = (aktor, aksi, type = 'normal') =>  {
    const now = new Date();
    const newLog = {
      id: `LOG-${Date.now()}`,
      tanggal: 'Hari Ini,', // Idealnya pakai library date-fns, tapi ini untuk contoh
      jam: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      aktor: aktor,
      aksi: aksi,
      type: type
    };
    // Masukkan log baru di urutan paling atas
    setLogList((prevLogs) => [newLog, ...prevLogs]);
  };


  const [karyawanList, setKaryawanList] = useState(initialKaryawanList);
  // [BARU] State untuk data cuti HR
  const [riwayatCuti, setRiwayatCuti] = useState(allLeaveHistory || []);
  
  // [BARU] State untuk mengontrol Tab Menu yang sedang aktif
  const [activeTab, setActiveTab] = useState('List Karyawan');

  // [UBAH] Memisahkan state Form Tambah dan Modal Edit agar sesuai dengan UI design
  const [showAddForm, setShowAddForm] = useState(false); 
  const [editTarget, setEditTarget] = useState(null); 
  const [deleteTarget, setDeleteTarget] = useState(null);

  const currentUserRole = user?.role?.toLowerCase(); // [BARU] Untuk dikirim ke komponen child
  const canDelete = isSuperAdmin(user);
  const canManageRole = isHrAdmin(user) || isSuperAdmin(user);
  const hasAccess = isHrAdmin(user) || isSuperAdmin(user);

  const stats = useMemo(() => {
    const total = karyawanList.length;
    const aktif = karyawanList.filter((k) => k.status === 'Aktif').length;
    const nonaktif = total - aktif;
    const totalDepartemen = new Set(karyawanList.map((k) => k.departemen)).size;
    return { total, aktif, nonaktif, totalDepartemen };
  }, [karyawanList]);

  // [UBAH] Fungsi handler disesuaikan dengan pemisahan state
  const handleToggleAdd = () => setShowAddForm(!showAddForm);
  const handleOpenEdit = (item) => setEditTarget(item);
  const handleCloseEdit = () => setEditTarget(null);

  const handleSubmitAddForm = (formData) => {
    const newItem = {
      ...formData,
      id: `KRY-${String(karyawanList.length + 1).padStart(4, '0')}`,
      kodeKaryawan: `SYS-${new Date().getFullYear()}-${String(karyawanList.length + 1).padStart(4, '0')}`,
      tanggalBergabung: new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
      status: 'Aktif'
    };

    // PANGGIL FUNGSI LOG DI SINI
    addLogActivity(user?.name || 'Admin HR', `menambahkan karyawan baru bernama "${formData.fullName}".`);

    setKaryawanList((prev) => [newItem, ...prev]);
    setShowAddForm(false);
  };

  const handleSubmitEditModal = (formData) => {
    // PANGGIL FUNGSI LOG DI SINI
    addLogActivity(user?.name || 'Admin HR', `mengupdate profil "${formData.namaLengkap}".`);
    setKaryawanList((prev) => prev.map((k) => (k.id === formData.id ? { ...k, ...formData } : k)));
    setEditTarget(null);
  };

  const handleRequestDelete = (item) => {
    setEditTarget(null); // Tutup modal edit jika sedang terbuka
    setDeleteTarget(item);
  };
  const handleCancelDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = (id) => {
    // Cari nama karyawan sebelum dihapus untuk ditulis di log
    const deletedKaryawan = karyawanList.find(k => k.id === id);
    
    // PANGGIL FUNGSI LOG DI SINI
    if(deletedKaryawan) {
      addLogActivity(user?.name || 'Admin HR', `menghapus data karyawan "${deletedKaryawan.name}".`);
    }
    setKaryawanList((prev) => prev.filter((k) => k.id !== id));
    setDeleteTarget(null);
  };

  if (!hasAccess) {
    return (
      <div className="karyawan-page">
        <div className="karyawan-page__body" style={{ padding: 32, textAlign: 'center' }}>
          Kamu tidak memiliki akses ke halaman Manajemen Sistem & Karyawan.
        </div>
      </div>
    );
  }

  // Fungsi ketika HR submit cuti susulan
  const handleSubmitCutiSusulan = (formData) => {
    // Tambahkan kembali di sini untuk keperluan debugging
  console.log("Submit Cuti Susulan Data:", formData);
    // Cari nama karyawan untuk dimasukkan ke log
    const karyawan = karyawanList.find(k => k.id === formData.karyawanId);
    const namaKaryawan = karyawan ? karyawan.name : 'Karyawan';

    const cutiBaru = {
      id: `CUTI-HR-${Date.now()}`,
      karyawan: { nama: namaKaryawan, kode: karyawan?.nik || '-' },
      jenisCuti: formData.jenisCuti,
      durasi: `${formData.startDate} s/d ${formData.endDate}`,
      statusBerkas: 'DISETUJUI', // Karena bypass / auto-acc
      // ... Anda bisa menambahkan properti lain sesuai kebutuhan mock data
    };

    setRiwayatCuti((prev) => [cutiBaru, ...prev]);
    
    // Catat ke Log Sistem
    addLogActivity(user?.name || 'Admin HR', `menginput cuti susulan (Auto-ACC) untuk "${namaKaryawan}".`);
    
    alert('Cuti susulan berhasil diproses!');
  };

  // Fungsi ketika HR melakukan Revoke (Pulihkan)
  const handleRevokeCuti = (cutiId) => {
  // 1. Cari data yang akan di-revoke terlebih dahulu
    const targetCuti = riwayatCuti.find(item => item.id === cutiId);
    
    if (targetCuti) {
      // 2. Catat log hanya SATU KALI di sini
      addLogActivity(user?.name || 'Admin HR', `memulihkan (revoke) status cuti "${targetCuti.karyawan?.  nama}" kembali ke Proses.`);
      
      // 3. Update state setelah log berhasil dicatat
      setRiwayatCuti((prev) => 
        prev.map(item => 
          item.id === cutiId ? { ...item, statusBerkas: 'PROSES' } : item
        )
      );
    }
  };

  return (
    <div className="karyawan-page">
      {/* [UBAH] Headline mungkin tidak perlu props stats jika mengikuti UI referensi, 
          tapi saya biarkan jika Anda masih membutuhkannya di dalam komponennya */}
      <HeadlineKaryawan data={karyawanList} />

      {/* [BARU] Render Tab Menu */}
      <TabMenuKaryawan activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="karyawan-page__body">
        {/* [BARU] Render Konten Berdasarkan Tab yang Aktif */}
        {activeTab === 'List Karyawan' && (
          <div className="list-karyawan-container">
            <FormKaryawan
              canManageRole={canManageRole}
              onSubmit={handleSubmitAddForm}
            />
            <TableKaryawan
              data={karyawanList}
              currentUserRole={currentUserRole}
              onEdit={handleOpenEdit}
            />
          </div>
        )}

        {/* Placeholder untuk tab lain yang akan disusul nanti */}
        {/* TAB CUTI KARYAWAN*/}
        {activeTab === 'Cuti Karyawan' && (
          <div className="cuti-karyawan-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <LeaveFormHr 
              karyawanList={karyawanList} 
              onSubmit={handleSubmitCutiSusulan} 
            />
            
            <LeaveListHr 
              data={riwayatCuti} 
              sisaCuti={{ totalHari: 12 }} 
              currentUserRole={currentUserRole}
              onOpenDetail={(item) => console.log("Buka Detail Cuti", item)}
              onRevokeLeave={handleRevokeCuti}
            />
          </div>
        )}
        {activeTab === 'Data Divisi' && (
          <DataDivisi karyawanList={karyawanList} />
        )}
        {activeTab === 'Log Sistem' && (
          <LogSistem logList={logList} />
        )}
      </div>

      {/* [BARU] Modal Detail Karyawan untuk fitur Edit */}
      {editTarget && (
        <ModalDetailKaryawan
          employeeData={editTarget}
          currentUserRole={currentUserRole}
          onClose={handleCloseEdit}
          onSave={handleSubmitEditModal}
          onDelete={() => handleRequestDelete(editTarget)}
        />
      )}

      <ConfirmDeleteModal
        item={deleteTarget}
        onCancel={handleCancelDelete}
        onConfirm={() => handleConfirmDelete(deleteTarget?.id)}
      />
    </div>
  );
};

export default Karyawan;