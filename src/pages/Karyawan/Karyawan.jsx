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

const Karyawan = ({ user }) => {
  const [karyawanList, setKaryawanList] = useState(initialKaryawanList);
  
  // [BARU] State untuk mengontrol Tab Menu yang sedang aktif
  const [activeTab, setActiveTab] = useState('List Karyawan');

  // [UBAH] Memisahkan state Form Tambah dan Modal Edit agar sesuai dengan UI design
  const [showAddForm, setShowAddForm] = useState(false); 
  const [editTarget, setEditTarget] = useState(null); 
  const [deleteTarget, setDeleteTarget] = useState(null);

  const currentUserRole = user?.role?.toLowerCase(); // [BARU] Untuk dikirim ke komponen child
  const canDelete = isSuperAdmin(user);
  const canManageRole = isSuperAdmin(user);
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
    setKaryawanList((prev) => [newItem, ...prev]);
    setShowAddForm(false);
  };

  const handleSubmitEditModal = (formData) => {
    setKaryawanList((prev) => prev.map((k) => (k.id === formData.id ? { ...k, ...formData } : k)));
    setEditTarget(null);
  };

  const handleRequestDelete = (item) => {
    setEditTarget(null); // Tutup modal edit jika sedang terbuka
    setDeleteTarget(item);
  };
  const handleCancelDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = (id) => {
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
        {activeTab === 'Cuti Karyawan' && <div>Konten Cuti Karyawan (Segera Hadir)</div>}
        {activeTab === 'Data Divisi' && <div>Konten Data Divisi (Segera Hadir)</div>}
        {activeTab === 'Log Sistem' && <div>Konten Log Sistem (Segera Hadir)</div>}
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