import React, { useEffect, useState } from 'react';
import './DataDivisi.css';
import {
  getAllDivisi,
  createDivisi,
  updateDivisi,
  deleteDivisi,
} from '../../../services/divisiService';

const DataDivisi = ({ karyawanList }) => {
  // State Utama
  const [divisiList, setDivisiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // State Input & Form
  const [newDivisiName, setNewDivisiName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // State Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToastMessage = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // 1. Fetch Data
  const fetchDivisiList = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getAllDivisi();
      setDivisiList(data || []);
    } catch (err) {
      setLoadError(err.message || 'Gagal memuat data divisi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisiList();
  }, []);

  // 2. Handler Tambah
  const handleAddDivisi = async () => {
    if (!newDivisiName.trim()) return;
    setIsAdding(true);
    try {
      await createDivisi(newDivisiName.trim());
      setNewDivisiName('');
      await fetchDivisiList();
      showToastMessage('Divisi berhasil ditambah!', 'success');
    } catch (err) {
      showToastMessage(err.message || 'Gagal menambah divisi.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // 3. Handler Edit
  const handleStartEdit = (divisi) => {
    setEditingId(divisi.id);
    setEditValue(divisi.namaDivisi);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) return;
    setIsSavingEdit(true);
    try {
      await updateDivisi(editingId, editValue.trim());
      setEditingId(null);
      await fetchDivisiList();
      showToastMessage('Divisi berhasil diperbarui.', 'success');
    } catch (err) {
      showToastMessage(err.message || 'Gagal menyimpan perubahan.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 4. Handler Hapus
  const handleDeleteRequest = (divisi) => {
    // Validasi apakah divisi dipakai karyawan
    const isUsed = karyawanList?.some(
      (emp) => emp.division === divisi.namaDivisi || emp.departemen === divisi.namaDivisi
    );

    if (isUsed) {
      showToastMessage(`Gagal! Divisi "${divisi.namaDivisi}" masih digunakan oleh karyawan.`, 'error');
    } else {
      setDeleteTarget(divisi);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteDivisi(deleteTarget.id);
      await fetchDivisiList();
      setDeleteTarget(null);
      showToastMessage('Divisi berhasil dihapus.', 'success');
    } catch (err) {
      showToastMessage(err.message || 'Gagal menghapus divisi.', 'error');
    }
  };

  return (
    <div className="card_data_divisi">
      {/* HEADER */}
      <div className="header_data_divisi">
        <div className="header-info_data_divisi">
          <div className="title-wrapper_data_divisi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon_data_divisi">
              <path d="M17 17.5C17 18.8807 15.8807 20 14.5 20C13.1193 20 12 18.8807 12 17.5C12 16.1193 13.1193 15 14.5 15C15.8807 15 17 16.1193 17 17.5ZM17 17.5H22M12 17.5H7M10 6.5C10 7.88071 8.88071 9 7.5 9C6.11929 9 5 7.88071 5 6.5C5 5.11929 6.11929 4 7.5 4C8.88071 4 10 5.11929 10 6.5ZM10 6.5H19M7.5 9V15M7.5 15C8.88071 15 10 16.1193 10 17.5C10 18.8807 8.88071 20 7.5 20C6.11929 20 5 18.8807 5 17.5C5 16.1193 6.11929 15 7.5 15Z" stroke="#124a35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2>Manajemen Divisi</h2>
          </div>
          <p>Kelola daftar divisi departemen untuk karyawan.</p>
        </div>

        <div className="header-actions_data_divisi">
          <input
            type="text"
            placeholder="Nama Divisi Baru..."
            value={newDivisiName}
            onChange={(e) => setNewDivisiName(e.target.value)}
            disabled={isAdding}
            className="input-new_data_divisi"
          />
          <button className="btn-add_data_divisi" onClick={handleAddDivisi} disabled={isAdding}>
            {isAdding ? 'Menambah...' : '+ Tambah'}
          </button>
        </div>
      </div>

      {/* TABLE/LIST */}
      <div className="list-container_data_divisi">
        <div className="list-header_data_divisi">
          <span>NAMA DIVISI / DEPARTEMEN</span>
          <span>AKSI</span>
        </div>

        <div className="list-body_data_divisi">
          {isLoading && <div className="empty-state_data_divisi">Memuat data...</div>}
          {!isLoading && loadError && <div className="empty-state_data_divisi" style={{ color: '#b91c1c' }}>{loadError}</div>}
          
          {!isLoading && !loadError && divisiList.map((divisi) => (
            <div className="list-row_data_divisi" key={divisi.id}>
              <div className="row-name_data_divisi">
                <span className="divisi-name-text_data_divisi">{divisi.namaDivisi}</span>
              </div>
              <div className="row-actions_data_divisi">
                <button className="btn-action-edit_data_divisi" onClick={() => handleStartEdit(divisi)}>
                  Edit
                </button>
                <button className="btn-action-delete_data_divisi" onClick={() => handleDeleteRequest(divisi)}>
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL EDIT */}
      {editingId && (
        <div className="modal-overlay_data_divisi">
          <div className="modal-content_data_divisi">
            {/* Header Modal */}
            <div className="modal-header-edit_data_divisi">
              <h3>Edit Nama Divisi</h3>
            </div>
            
            {/* Body Modal */}
            <div className="modal-body-edit_data_divisi">
              <label>NAMA DIVISI BARU</label>
              <input 
                type="text" 
                value={editValue} 
                onChange={(e) => setEditValue(e.target.value)} 
                autoFocus 
              />
            </div>
            
            {/* Footer Modal */}
            <div className="modal-footer-edit_data_divisi">
              <button className="btn-batal-modal_data_divisi" onClick={handleCancelEdit}>
                Batal
              </button>
              <button className="btn-simpan-modal_data_divisi" onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {deleteTarget && (
        <div className="modal-overlay_data_divisi">
          <div className="modal-delete-content_data_divisi">
            <h3>Hapus Divisi</h3>
            <p>Yakin ingin menghapus "{deleteTarget.namaDivisi}"?</p>
            <div className="modal-delete-footer_data_divisi">
              <button className="btn-batal-modal_data_divisi" onClick={() => setDeleteTarget(null)}>Batal</button>
              <button className="btn-confirm-delete_data_divisi" onClick={handleConfirmDelete}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className={`toast_data_divisi toast_data_divisi--${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default DataDivisi;