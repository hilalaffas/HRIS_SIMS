import React, { useEffect, useState } from 'react';
import { Workflow, Plus, Pencil, Trash2, X } from 'lucide-react';
import './DataDivisi.css';
import {
  getAllDivisi,
  createDivisi,
  updateDivisi,
  deleteDivisi,
} from '../../../services/divisiService';
import { getAllShift } from '../../../services/shiftService';
import DivisiTypeToggle, { DIVISI_TYPE_LABEL } from './DivisiTypeToggle';
import DivisiShiftSettings from './DivisiShiftSettings';
import ScheduleBuilder from './ScheduleBuilder';

const DataDivisi = ({ karyawanList }) => {
  // State Utama
  const [divisiList, setDivisiList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // [BARU] Master jam shift -- dipakai DivisiShiftSettings & ScheduleBuilder
  const [shifts, setShifts] = useState([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(true);
  const [shiftsError, setShiftsError] = useState(null);

  // State Input & Form
  const [newDivisiName, setNewDivisiName] = useState('');
  // [BARU] Tipe divisi untuk form tambah: 'REGULAR' | 'SHIFTING'
  const [newDivisiType, setNewDivisiType] = useState('REGULAR');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  // [BARU] Tipe divisi untuk modal Edit
  const [editType, setEditType] = useState('REGULAR');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isNameEmpty, setIsNameEmpty] = useState(false);
  const [isEditValueEmpty, setIsEditValueEmpty] = useState(false);

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

  // [BARU] Fetch master shift
  const fetchShifts = async () => {
    setIsLoadingShifts(true);
    setShiftsError(null);
    try {
      const data = await getAllShift();
      setShifts(data || []);
    } catch (err) {
      setShiftsError(err.message || 'Gagal memuat data shift.');
    } finally {
      setIsLoadingShifts(false);
    }
  };

  useEffect(() => {
    fetchDivisiList();
    fetchShifts();
  }, []);

  // [BARU] Cek nama kembar (abaikan huruf besar/kecil), excludeId = divisi yang sedang diedit
  const isDuplicateName = (name, excludeId = null) =>
    divisiList.some(
      (d) => d.id !== excludeId && d.namaDivisi.trim().toLowerCase() === name.trim().toLowerCase()
    );

  // 2. Handler Tambah
  const handleAddDivisi = async () => {
    if (!newDivisiName.trim()) {
      setIsNameEmpty(true);
      showToastMessage('Harap isi nama divisi terlebih dahulu.', 'error');
      return;
    }
    if (isDuplicateName(newDivisiName)) {
      showToastMessage(`Divisi "${newDivisiName.trim()}" sudah ada.`, 'error');
      return;
    }
    setIsNameEmpty(false);
    setIsAdding(true);
    try {
      await createDivisi(newDivisiName.trim(), newDivisiType);
      setNewDivisiName('');
      setNewDivisiType('REGULAR');
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
    setEditType(divisi.tipeDivisi || 'REGULAR');
    setIsEditValueEmpty(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setEditType('REGULAR');
    setIsEditValueEmpty(false);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      setIsEditValueEmpty(true);
      showToastMessage('Harap isi nama divisi terlebih dahulu.', 'error');
      return;
    }
    if (isDuplicateName(editValue, editingId)) {
      showToastMessage(`Divisi "${editValue.trim()}" sudah ada.`, 'error');
      return;
    }
    setIsEditValueEmpty(false);
    setIsSavingEdit(true);
    try {
      await updateDivisi(editingId, editValue.trim(), editType);
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
      (emp) =>
        emp.divisi?.id === divisi.id ||
        emp.division === divisi.namaDivisi ||
        emp.departemen === divisi.namaDivisi
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
    <div className="page_data_divisi">
      {/* ===== KARTU 1: MANAJEMEN DIVISI ===== */}
      <div className="card_data_divisi">
        {/* HEADER */}
        <div className="header_data_divisi">
          <div className="header-info_data_divisi">
            <div className="title-wrapper_data_divisi">
              <Workflow size={20} className="icon_data_divisi" />
              <h2>Manajemen Divisi</h2>
            </div>
            <p>Kelola daftar divisi departemen untuk karyawan.</p>
          </div>

          <div className="header-actions_data_divisi">
            <div className="input-wrapper_data_divisi">
              <input
                type="text"
                placeholder="Nama Divisi Baru..."
                value={newDivisiName}
                onChange={(e) => {
                  setNewDivisiName(e.target.value);
                  if (isNameEmpty && e.target.value.trim()) setIsNameEmpty(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddDivisi();
                }}
                disabled={isAdding}
                className={`input-new_data_divisi${isNameEmpty ? ' input-new_data_divisi--error' : ''}`}
              />
              {isNameEmpty && (
                <span className="input-error-text_data_divisi">Harap isi nama divisi</span>
              )}
            </div>
            <DivisiTypeToggle value={newDivisiType} onChange={setNewDivisiType} disabled={isAdding} />
            <button className="btn-add_data_divisi" onClick={handleAddDivisi} disabled={isAdding}>
              <Plus size={16} />
              {isAdding ? 'Menambah...' : 'Tambah'}
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
            {!isLoading && loadError && (
              <div className="empty-state_data_divisi" style={{ color: '#b91c1c' }}>{loadError}</div>
            )}
            {!isLoading && !loadError && divisiList.length === 0 && (
              <div className="empty-state_data_divisi">Belum ada divisi.</div>
            )}

            {!isLoading && !loadError && divisiList.map((divisi) => {
              const tipe = divisi.tipeDivisi || 'REGULAR';
              return (
                <div className="list-row_data_divisi" key={divisi.id}>
                  <div className="row-name_data_divisi">
                    <span className="divisi-name-text_data_divisi">{divisi.namaDivisi}</span>
                    <span className={`badge-tipe_data_divisi badge-tipe_data_divisi--${tipe.toLowerCase()}`}>
                      {DIVISI_TYPE_LABEL[tipe] || tipe}
                    </span>
                  </div>
                  <div className="row-actions_data_divisi">
                    <button className="btn-action-edit_data_divisi" onClick={() => handleStartEdit(divisi)}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button className="btn-action-delete_data_divisi" onClick={() => handleDeleteRequest(divisi)}>
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== KARTU 2: PENGATURAN JAM KERJA SHIFT ===== */}
      <DivisiShiftSettings
        shifts={shifts}
        isLoading={isLoadingShifts}
        error={shiftsError}
        onSaved={fetchShifts}
        onToast={showToastMessage}
      />

      {/* ===== KARTU 3: BUILDER JADWAL ABSENSI BULANAN ===== */}
      <ScheduleBuilder
        karyawanList={karyawanList}
        divisiList={divisiList}
        shifts={shifts}
        onToast={showToastMessage}
      />

      {/* MODAL EDIT */}
      {editingId && (
        <div
          className="modal-overlay_data_divisi"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleCancelEdit();
          }}
        >
          <div className="modal-content_data_divisi" role="dialog" aria-modal="true" aria-labelledby="edit-divisi-title">
            {/* Header Modal */}
            <div className="modal-header-edit_data_divisi">
              <div>
                <h3 id="edit-divisi-title">Edit Divisi</h3>
                <p>Perbarui nama dan tipe divisi.</p>
              </div>
              <button className="btn-close-modal_data_divisi" onClick={handleCancelEdit} aria-label="Tutup popup">
                <X size={18} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="modal-body-edit_data_divisi">
              <label htmlFor="edit-divisi-name">Nama Divisi</label>
              <input
                id="edit-divisi-name"
                type="text"
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  if (isEditValueEmpty && e.target.value.trim()) setIsEditValueEmpty(false);
                }}
                className={isEditValueEmpty ? 'input-edit_data_divisi--error' : ''}
                autoFocus
              />
              {isEditValueEmpty && (
                <span className="input-error-text_data_divisi">Harap isi nama divisi</span>
              )}

              <label className="label-tipe_data_divisi">Tipe Divisi</label>
              <DivisiTypeToggle value={editType} onChange={setEditType} fullWidth />
            </div>

            {/* Footer Modal */}
            <div className="modal-footer-edit_data_divisi">
              <button className="btn-batal-modal_data_divisi" onClick={handleCancelEdit}>
                Batal
              </button>
              <button className="btn-simpan-modal_data_divisi" onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
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
