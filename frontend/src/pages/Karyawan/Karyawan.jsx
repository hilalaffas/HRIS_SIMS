import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom'; // [BARU] baca query param dari notifikasi reset sandi
import './Karyawan.css';
import HeadlineKaryawan from './components/HeadlineKaryawan';
import TabMenuKaryawan from './components/TabMenuKaryawan';
import TableKaryawan from './components/TableKaryawan';
import FormKaryawan from './components/FormKaryawan';
import ModalDetailKaryawan from './components/ModalDetailKaryawan'; // [BARU] Import komponen modal baru
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import { isSuperAdmin, isHrAdmin } from '../../utils/roles';
import DataDivisi from './components/DataDivisi';
import LogSistem from './components/LogSistem';
import LeaveFormHr from './components/LeaveFormHr';
import LeaveListHr from './components/LeaveListHr';
// [BARU] Toast sukses/gagal untuk aksi HR di halaman ini (mis. Cuti Susulan),
// pola sama seperti FormKaryawan.jsx.
import Toast from '../../components/Toast';
// [UBAH] Data cuti karyawan sekarang diambil dari backend asli
// (getAllLeaveRequestsForHr), bukan lagi dari mock allLeaveHistory.
import { getAllLeaveRequestsForHr } from '../../services/CutiService';
import FormCuti from '../Cuti/approve/components/Form';
import { getKaryawanList, deleteKaryawan } from '../../services/karyawanService';
import { getSystemLogs } from '../../services/logService'; 


const Karyawan = ({ user }) => {
    // 2. Tambahkan state untuk Log
    const [logList, setLogList] = useState([]);

  // State untuk menyimpan data cuti yang sedang diklik tombol "Rincian"-nya
const [detailCutiTarget, setDetailCutiTarget] = useState(null);

  // [BARU] Toast sukses/gagal untuk halaman ini (mis. setelah submit Cuti
  // Susulan). action opsional -> render link kecil (mis. "Detail") di toast.
  const [toast, setToast] = useState(null);
  const triggerToast = (message, type = 'success', action = null) => {
    setToast({ message, type, action });
    setTimeout(() => setToast(null), 3000);
  };

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
  // [UBAH] State data cuti HR — sekarang diisi dari backend asli (lihat
  // fetchRiwayatCuti), tidak lagi dari mock allLeaveHistory.
  const [riwayatCuti, setRiwayatCuti] = useState([]);
  
  // [BARU] State untuk mengontrol Tab Menu yang sedang aktif
  const [activeTab, setActiveTab] = useState('List Karyawan');

  // [UBAH] Memisahkan state Form Tambah dan Modal Edit agar sesuai dengan UI design
  const [showAddForm, setShowAddForm] = useState(false); 
  const [editTarget, setEditTarget] = useState(null); 
  const [deleteTarget, setDeleteTarget] = useState(null);

  // [BARU] Dipakai saat halaman ini dibuka dari notifikasi lonceng "Permintaan
  // Reset Sandi" di Navbar (URL: /karyawan?employeeId=X&resetRequestId=Y).
  // pendingResetRequestId diteruskan ke ModalDetailKaryawan supaya saat HR
  // menyimpan password baru, backend otomatis menandai permintaan reset itu
  // selesai (lihat ModalDetailKaryawan.jsx & backend UserController).
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingResetRequestId, setPendingResetRequestId] = useState(null);

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
  // [UBAH] Ikut bersihkan pendingResetRequestId supaya tidak "nempel" ke
  // karyawan lain yang dibuka manual (bukan lewat notifikasi) setelahnya.
  const handleCloseEdit = () => {
    setEditTarget(null);
    setPendingResetRequestId(null);
  };

  const fetchKaryawan = async () => {
    try {
      const response = await getKaryawanList();
      // Asumsi backend mengembalikan array of object di response.data atau response langsung
      setKaryawanList(response.data || response || []);
    } catch (error) {
      console.error("Gagal menarik data karyawan:", error);
    }
  };


  // [BARU] Fungsi fetch untuk Log Sistem dari Backend
  const fetchLogs = async () => {
  try {
    const response = await getSystemLogs();
    const logsData = response.data || response || [];
    
    // Melakukan mapping data dari backend ke format yang dimengerti LogSistem
    const formattedLogs = logsData.map(log => {
      // Memisahkan tanggal dan jam dari createdAt (LocalDateTime)
      const dateObj = new Date(log.createdAt);
      
      return {
        id: log.logId,
        tanggal: dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        jam: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        aktor: log.username,
        aksi: log.description || log.action, // Menggunakan description atau action dari backend
        type: 'normal' // Sesuaikan jika ada field type di backend
      };
    });
    
    setLogList(formattedLogs);
  } catch (error) {
    console.error("Gagal menarik data log dari server:", error);
  }
};

  useEffect(() => {
    fetchKaryawan();
  }, []);

  // [BARU] Ambil data cuti karyawan (termasuk hasil Cuti Susulan HR) dari
  // backend asli — dipanggil ulang tiap kali tab "Cuti Karyawan" dibuka atau
  // setelah HR berhasil submit cuti susulan, supaya tabel selalu sinkron.
  const fetchRiwayatCuti = async () => {
    try {
      const data = await getAllLeaveRequestsForHr();
      setRiwayatCuti(data || []);
      return data || [];
    } catch (error) {
      console.error('Gagal menarik data cuti karyawan:', error);
      return [];
    }
  };

  // [BARU] Auto-buka modal edit karyawan kalau halaman ini diakses dari
  // notifikasi reset sandi (query param employeeId & resetRequestId).
  // Menunggu karyawanList terisi dulu supaya pencariannya tidak sia-sia.
  useEffect(() => {
    const employeeIdParam = searchParams.get('employeeId');
    if (!employeeIdParam || karyawanList.length === 0) return;

    const target = karyawanList.find(
      (k) => String(k.employeeId ?? k.id) === String(employeeIdParam)
    );

    if (target) {
      setEditTarget(target);
      setPendingResetRequestId(searchParams.get('resetRequestId') || null);
    }

    // Bersihkan query param dari URL supaya tidak auto-buka lagi kalau modal
    // ditutup lalu halaman ini refetch/re-render (mis. setelah save).
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [karyawanList]);

  // [BARU] Efek ini hanya akan memanggil API Log jika tab Log Sistem diklik
  useEffect(() => {
    if (activeTab === 'Log Sistem') {
      fetchLogs();
    }
  }, [activeTab]);

  // [BARU] Sama seperti Log Sistem: fetch data cuti hanya saat tab
  // "Cuti Karyawan" dibuka, supaya tidak ada API call yang sia-sia.
  useEffect(() => {
    if (activeTab === 'Cuti Karyawan') {
      fetchRiwayatCuti();
    }
  }, [activeTab]);

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
      setPendingResetRequestId(null); // [BARU]
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

  // [UBAH] Fungsi ketika HR submit cuti susulan — pengiriman ke backend
  // (POST /api/cuti/urgent) SUDAH dilakukan di dalam LeaveFormHr.jsx (sama
  // seperti pola FormKaryawan.jsx untuk tambah karyawan). Di sini kita
  // cukup refetch dari server supaya tabel selalu konsisten dengan data asli,
  // lalu tampilkan toast sukses dengan link "Detail" ke pengajuan barunya.
  const handleSubmitCutiSusulan = async (info) => {
    try {
      const freshList = await fetchRiwayatCuti();
      addLogActivity(user?.name || 'Admin HR', `menginput cuti susulan (Auto-ACC) untuk "${info?.karyawanNama || 'karyawan'}".`);

      const createdItem = freshList.find((item) => item.id === info?.leaveRequestId);
      triggerToast(
        'Cuti Backdate berhasil diproses (Auto-ACC).',
        'success',
        createdItem ? { label: 'Detail', onClick: () => setDetailCutiTarget(createdItem) } : null
      );
    } catch (error) {
      console.error('Gagal me-refresh riwayat cuti setelah submit cuti susulan:', error);
      triggerToast('Cuti susulan tersimpan, tapi gagal memuat ulang daftar. Coba refresh halaman.', 'error');
    }
  };

  // [BELUM TERHUBUNG BACKEND] Revoke/Pulihkan cuti masih mengubah state
  // lokal saja (belum ada endpoint restore/force-cancel di backend). Efeknya
  // hanya tampil sementara di layar dan akan kembali ke data asli begitu tab
  // ini dibuka ulang atau halaman di-refresh. Ini scope terpisah dari Cuti
  // Susulan — belum digarap di iterasi ini.
  const handleRevokeCuti = (cutiId) => {
    const targetCuti = riwayatCuti.find(item => item.id === cutiId);

    if (targetCuti) {
      addLogActivity(user?.name || 'Admin HR', `memulihkan (revoke) status cuti "${targetCuti.karyawan?.nama}" kembali ke Proses. (belum tersimpan ke backend)`);

      setRiwayatCuti((prev) =>
        prev.map(item =>
          item.id === cutiId ? { ...item, statusBerkas: 'PROSES' } : item
        )
      );
    }
  };

  return (
    <div className="karyawan-page">
      {/* [BARU] Toast sukses/gagal (mis. hasil submit Cuti Susulan) */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          actionLabel={toast.action?.label}
          onAction={toast.action?.onClick}
        />
      )}

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
              // [BELUM] Sisa Cuti masih placeholder sama untuk semua karyawan
              // (backend belum punya endpoint saldo per-karyawan arbitrary,
              // getMyLeaveBalance saat ini hanya untuk user yang login sendiri).
              // Di luar scope Cuti Susulan — perlu endpoint baru kalau mau digarap.
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
          resetRequestId={pendingResetRequestId}
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