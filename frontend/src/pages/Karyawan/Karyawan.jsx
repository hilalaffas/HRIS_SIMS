import React, { useMemo, useState, useEffect } from 'react';
import './Karyawan.css';
import HeadlineKaryawan from './components/HeadlineKaryawan';
import TabMenuKaryawan from './components/TabMenuKaryawan';
import TableKaryawan from './components/TableKaryawan';
import FormKaryawan from './components/FormKaryawan';
import ModalDetailKaryawan from './components/ModalDetailKaryawan'; // [BARU] Import komponen modal baru
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import { isSuperAdmin, isHrAdmin } from '../../utils/roles1';
import DataDivisi from './components/DataDivisi';
import LogSistem from './components/LogSistem';
import { initialLogs } from './data/mockLogs'
import LeaveFormHr from './components/LeaveFormHr';
import LeaveListHr from './components/LeaveListHr';
import {allLeaveHistory} from '../Cuti/approve/data/mockData';
import FormCuti from '../Cuti/approve/components/Form';
import { getKaryawanList, deleteKaryawan } from '../../services/karyawanService';


const Karyawan = ({ user }) => {
    // 2. Tambahkan state untuk Log
  const [logList, setLogList] = useState(initialLogs);

  // State untuk menyimpan data cuti yang sedang diklik tombol "Rincian"-nya
const [detailCutiTarget, setDetailCutiTarget] = useState(null);

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


  const [karyawanList, setKaryawanList] = useState([]);
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

  const fetchKaryawan = async () => {
    try {
      const response = await getKaryawanList();
      // Asumsi backend mengembalikan array of object di response.data atau response langsung
      setKaryawanList(response.data || response || []);
    } catch (error) {
      console.error("Gagal menarik data karyawan:", error);
    }
  };

  useEffect(() => {
    fetchKaryawan();
  }, []);

  const handleSubmitAddForm = async (formData) => {
    // Catatan: registrasi ke backend (termasuk upload foto) SUDAH dilakukan
    // di dalam FormKaryawan.jsx. Di sini kita TIDAK perlu panggil registerKaryawan lagi
    // (sebelumnya ini menyebabkan data terkirim dobel ke backend).
    // Cukup ambil ulang daftar karyawan dari server supaya tabel langsung ter-update
    // tanpa reload halaman, dan datanya selalu konsisten dengan backend.
    try {
      await fetchKaryawan();
      setShowAddForm(false);
      addLogActivity(user?.name, `menambahkan karyawan baru: ${formData.fullName}`);
    } catch (error) {
      console.error("Gagal me-refresh daftar karyawan:", error);
    }
  };

  const handleSubmitEditModal = async (formData) => {
    // Catatan: penyimpanan ke backend SUDAH dilakukan di dalam
    // ModalDetailKaryawan.jsx (sama seperti pola FormKaryawan.jsx untuk
    // tambah karyawan). Di sini kita cukup refetch dari server supaya
    // tabel selalu konsisten dengan data asli, termasuk divisi yang baru diubah.
    try {
      await fetchKaryawan();
      addLogActivity(user?.name || 'Admin HR', `mengupdate profil "${formData.namaLengkap}".`);
      setEditTarget(null);
    } catch (error) {
      console.error("Gagal me-refresh daftar karyawan:", error);
    }
  };

  const handleRequestDelete = (item) => {
    setEditTarget(null); // Tutup modal edit jika sedang terbuka
    setDeleteTarget(item);
  };
  const handleCancelDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = async (id) => {
    // Cari nama karyawan sebelum dihapus untuk ditulis di log
    const deletedKaryawan = karyawanList.find((k) => (k.employeeId ?? k.id) === id);

    try {
      await deleteKaryawan(id);
      if (deletedKaryawan) {
        addLogActivity(user?.name || 'Admin HR', `menghapus data karyawan "${deletedKaryawan.fullName}".`);
      }
      await fetchKaryawan();
    } catch (error) {
      console.error("Gagal menghapus karyawan:", error);
    } finally {
      setDeleteTarget(null);
    }
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
      console.log("Submit Cuti Susulan Data:", formData);
      
      // PERBAIKAN: Gunakan k.employeeId atau k.id untuk pencarian
      const karyawan = karyawanList.find(k => (k.employeeId || k.id) === formData.karyawanId);
      
      // PERBAIKAN: Gunakan fullName, bukan name
      const namaKaryawan = karyawan ? karyawan.fullName : 'Karyawan';
  
      const cutiBaru = {
        id: `CUTI-HR-${Date.now()}`,
        // PERBAIKAN: Gunakan nikKaryawan, bukan nik
        karyawan: { nama: namaKaryawan, kode: karyawan?.nikKaryawan || '-' },
        jenisCuti: formData.jenisCuti,
        durasi: `${formData.startDate} s/d ${formData.endDate}`,
        statusBerkas: 'DISETUJUI', 
      };
    
      setRiwayatCuti((prev) => [cutiBaru, ...prev]);
      
      addLogActivity(user?.name || 'Admin HR', `menginput cuti susulan (Auto-ACC) untuk "${namaKaryawan}".  `);
      
      alert('Cuti susulan berhasil diproses!');
    };
  
    // Fungsi ketika HR melakukan Revoke (Pulihkan)
    const handleRevokeCuti = (cutiId) => {
    // 1. Cari data yang akan di-revoke terlebih dahulu
      const targetCuti = riwayatCuti.find(item => item.id === cutiId);
      
      if (targetCuti) {
        // 2. Catat log hanya SATU KALI di sini
        addLogActivity(user?.name || 'Admin HR', `memulihkan (revoke) status cuti "${targetCuti.karyawan?.    nama}" kembali ke Proses.`);
        
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
              onOpenDetail={(item) => setDetailCutiTarget(item)}
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
        onConfirm={() => handleConfirmDelete(deleteTarget?.employeeId ?? deleteTarget?.id)}
      />

      {/* --- TAMBAHKAN KODE INI --- */}
      {detailCutiTarget && (
        <FormCuti 
          data={detailCutiTarget} 
          onClose={() => setDetailCutiTarget(null)} 
        />
      )}
    </div>
  );
};

export default Karyawan;