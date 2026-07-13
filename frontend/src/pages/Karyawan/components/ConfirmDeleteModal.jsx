import React, { useEffect } from 'react';
import './ConfirmDeleteModal.css';

/**
 * ConfirmDeleteModal.jsx
 * ------------------------------------------------------------------
 * Konfirmasi sebelum menghapus data karyawan. Dipisah jadi file
 * sendiri karena aksi ini destruktif & hanya boleh dipicu oleh
 * Super Admin (pengecekan hak akses dilakukan di Karyawan.jsx
 * sebelum modal ini dirender).
 *
 * Props:
 *  - item: karyawan yang akan dihapus | null (null -> return null)
 *  - onCancel: () => void
 *  - onConfirm: (id) => void
 * ------------------------------------------------------------------
 */
const ConfirmDeleteModal = ({ item, onCancel, onConfirm }) => {
  useEffect(() => {
    if (!item) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [item, onCancel]);

  if (!item) return null;

  return (
    <div className="confirm-delete__overlay" onMouseDown={onCancel}>
      <div
        className="confirm-delete__modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="confirm-delete__icon">!</div>
        <h2 id="confirm-delete-title" className="confirm-delete__title">
          Hapus Data Karyawan?
        </h2>
        <p className="confirm-delete__desc">
          Kamu akan menghapus <strong>{item.fullName}</strong> ({item.nikKaryawan}) secara permanen.
          Tindakan ini tidak dapat dibatalkan.
        </p>

        <div className="confirm-delete__footer">
          <button type="button" className="confirm-delete__btnCancel" onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="confirm-delete__btnConfirm" onClick={() => onConfirm(item.id)}>
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
