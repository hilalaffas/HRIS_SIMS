// src/pages/Dashboard/components/AnnouncementModal.jsx
import React, { useState } from 'react';

export default function AnnouncementModal({ isOpen, onClose, onSubmit }) {
  const [judul, setJudul] = useState('');
  const [label, setLabel] = useState('penting');
  const [isi, setIsi] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setJudul('');
    setLabel('penting');
    setIsi('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!judul.trim() || !isi.trim()) return;

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
        <div className="bg-[#0A4D44] px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-bold text-base">Buat Pengumuman Baru</h3>
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
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Kebijakan Libur Lebaran"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#0A4D44]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Label / Tag
            </label>
            <select
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#0A4D44] bg-white"
            >
              <option value="penting">Penting (Merah)</option>
              <option value="update">Update (Hijau)</option>
              <option value="info">Info (Biru)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Isi Berita
            </label>
            <textarea
              rows={4}
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              placeholder="Tulis rincian pengumuman..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#0A4D44] resize-none"
              required
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
              className="px-5 py-2 rounded-lg bg-[#0A4D44] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? 'Menyimpan...' : 'Terbitkan Berita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}