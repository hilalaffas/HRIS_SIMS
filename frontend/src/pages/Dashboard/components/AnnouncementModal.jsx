// src/pages/Dashboard/components/AnnouncementModal.jsx
import React, { useState, useEffect } from 'react';
import Dropdown from '../../../components/Dropdown';
import Toast from '../../../components/Toast';
import { validateRequired, inputErrorClass } from '../../../utils/validation';

export default function AnnouncementModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const [judul, setJudul] = useState('');
  const [label, setLabel] = useState('penting');
  const [isi, setIsi] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // [BARU] Sebelumnya handleSubmit cuma `if (!judul.trim() || !isi.trim()) return;`
  // -- form diam saja kalau ada yang kosong. Sekarang tiap field dicek lewat
  // validateRequired(), errors dipakai untuk border merah, toast menunjukkan
  // pesan spesifik field yang kosong.
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isEditMode = !!initialData;

  // Isi ulang form setiap modal dibuka: kosong untuk mode Tambah,
  // terisi data lama untuk mode Edit.
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setJudul(initialData.judul || '');
      setLabel(initialData.label || 'penting');
      setIsi(initialData.isi || '');
    } else {
      setJudul('');
      setLabel('penting');
      setIsi('');
    }
    setErrors({});
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const resetForm = () => {
    setJudul('');
    setLabel('penting');
    setIsi('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors: newErrors, isValid, firstErrorMessage } = validateRequired([
      { field: 'judul', label: 'Judul pengumuman', value: judul },
      { field: 'isi', label: 'Isi berita', value: isi },
    ]);
    if (!isValid) {
      setErrors(newErrors);
      showToast(firstErrorMessage);
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      await onSubmit({ judul, label, isi });
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[var(--color-primary)] px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold text-base">
            {isEditMode ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
          </h3>
          <button type="button" onClick={handleClose} className="text-white hover:opacity-70 text-lg leading-none">
            &times;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Judul Pengumuman
            </label>
            <input
              type="text"
              value={judul}
              onChange={(e) => { setJudul(e.target.value); if (errors.judul) setErrors((prev) => ({ ...prev, judul: undefined })); }}
              placeholder="Contoh: Kebijakan Libur Lebaran"
              className={inputErrorClass(errors.judul, 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)]')}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Label / Tag
            </label>
            <Dropdown
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              options={[
                { value: 'penting', label: 'Penting (Merah)' },
                { value: 'update', label: 'Update (Hijau)' },
                { value: 'info', label: 'Info (Biru)' },
              ]}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Isi Berita
            </label>
            <textarea
              rows={4}
              value={isi}
              onChange={(e) => { setIsi(e.target.value); if (errors.isi) setErrors((prev) => ({ ...prev, isi: undefined })); }}
              placeholder="Tulis rincian pengumuman..."
              className={inputErrorClass(errors.isi, 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] resize-none')}
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Terbitkan Berita'}
            </button>
          </div>
        </form>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}