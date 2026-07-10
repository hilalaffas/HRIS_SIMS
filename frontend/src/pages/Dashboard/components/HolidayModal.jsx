// src/pages/Dashboard/components/HolidayModal.jsx
import React, { useState, useEffect } from 'react';

export default function HolidayModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const [tanggal, setTanggal] = useState('');
  const [nama, setNama] = useState('');
  const [isNational, setIsNational] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!initialData;

  // Isi ulang form setiap modal dibuka: kosong untuk mode Tambah,
  // terisi data lama untuk mode Edit.
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setTanggal(initialData.tanggal || '');
      setNama(initialData.nama || '');
      setIsNational(!!initialData.isNational);
    } else {
      setTanggal('');
      setNama('');
      setIsNational(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTanggal('');
    setNama('');
    setIsNational(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tanggal || !nama.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ tanggal, nama, isNational });
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
        <div className="bg-[#0A4D44] px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold text-base">
            {isEditMode ? 'Edit Hari Libur' : 'Jadwalkan Hari Libur'}
          </h3>
          <button type="button" onClick={handleClose} className="text-white hover:opacity-70 text-lg leading-none">
            &times;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Pilih Tanggal Libur
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#0A4D44]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Nama Hari Libur
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Tahun Baru Masehi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#0A4D44]"
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isNational}
              onChange={(e) => setIsNational(e.target.checked)}
              className="w-4 h-4 accent-[#0A4D44]"
            />
            <span className="text-xs text-gray-600">
              Tandai sebagai hari libur nasional (bukan libur tambahan perusahaan)
            </span>
          </label>

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
              className="px-5 py-2 rounded-lg bg-[#0A4D44] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Menyimpan...' : isEditMode ? 'Simpan Perubahan' : 'Simpan Libur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}