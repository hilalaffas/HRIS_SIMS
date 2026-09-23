// src/pages/Dashboard/components/AnnouncementModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import Dropdown from '../../../components/Dropdown';
import Toast from '../../../components/Toast';
import { validateRequired, inputErrorClass } from '../../../utils/validation';
import { uploadAnnouncementImage } from '../../../services/announcementService';
import './AnnouncementModal.css';

const DEFAULT_MASA_TAYANG_HARI = 30;

// [BARU] <input type="datetime-local"> butuh format "YYYY-MM-DDTHH:mm" --
// tanpa detik, tanpa timezone. Dipakai baik untuk pre-fill dari ISO string
// backend (mode Edit) maupun untuk nilai default (mode Tambah).
function toDatetimeLocalValue(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function plusDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function AnnouncementModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const [judul, setJudul] = useState('');
  const [label, setLabel] = useState('penting');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // [BARU] Sebelumnya handleSubmit cuma `if (!judul.trim() || !isi.trim()) return;`
  // -- form diam saja kalau ada yang kosong. Sekarang tiap field dicek lewat
  // validateRequired(), errors dipakai untuk border merah, toast menunjukkan
  // pesan spesifik field yang kosong.
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  // [BARU] Isi berita sekarang editor rich-text (contentEditable), bukan
  // <textarea> polos lagi -- lihat blok "Editor gaya blog" di bawah. Dibaca
  // langsung dari editorRef.current.innerHTML saat submit, BUKAN state React
  // biasa, supaya kursor tidak lompat-lompat tiap ketikan (masalah umum
  // contentEditable kalau di-render ulang dari state tiap keystroke).
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // [BARU] Opsi jadwal tayang.
  const [kirimSekarang, setKirimSekarang] = useState(true);
  const [dikirimPada, setDikirimPada] = useState('');
  const [selesaiPada, setSelesaiPada] = useState('');
  // Supaya auto-isi "Selesai = Dikirim + 30 hari" tidak menimpa tanggal yang
  // SUDAH sengaja diubah manual oleh user.
  const selesaiDiubahManual = useRef(false);

  const isEditMode = !!initialData;

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Isi ulang form setiap modal dibuka: kosong untuk mode Tambah,
  // terisi data lama untuk mode Edit.
  useEffect(() => {
    if (!isOpen) return;
    selesaiDiubahManual.current = false;

    if (initialData) {
      setJudul(initialData.judul || '');
      setLabel(initialData.label === 'update' ? 'penting' : (initialData.label || 'penting'));
      if (editorRef.current) editorRef.current.innerHTML = initialData.isi || '';

      // Mode Edit: jadwal yang sudah ada dipertahankan, bukan "kirim sekarang".
      setKirimSekarang(false);
      const publishAt = initialData.publishAt ? new Date(initialData.publishAt) : new Date();
      const expiresAt = initialData.expiresAt ? new Date(initialData.expiresAt) : plusDays(publishAt, DEFAULT_MASA_TAYANG_HARI);
      setDikirimPada(toDatetimeLocalValue(publishAt));
      setSelesaiPada(toDatetimeLocalValue(expiresAt));
    } else {
      setJudul('');
      setLabel('penting');
      if (editorRef.current) editorRef.current.innerHTML = '';

      setKirimSekarang(true);
      const now = new Date();
      setDikirimPada(toDatetimeLocalValue(now));
      setSelesaiPada(toDatetimeLocalValue(plusDays(now, DEFAULT_MASA_TAYANG_HARI)));
    }
    setErrors({});
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const resetForm = () => {
    setJudul('');
    setLabel('penting');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setKirimSekarang(true);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ----- Editor gaya blog (Bold/Italic/List/Link/Gambar) -----
  // [BARU] document.execCommand SUDAH deprecated di spec HTML, tapi masih
  // didukung penuh oleh semua browser modern dan tetap jadi cara paling
  // ringan untuk toolbar format dasar tanpa menambah dependency npm baru
  // (selaras dengan konvensi proyek ini: CSS/JS vanilla dulu, library baru
  // cuma kalau memang perlu). Kalau nanti butuh format lebih kompleks,
  // pertimbangkan library seperti Quill/TipTap sebagai pengganti blok ini.
  const applyFormat = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const handleInsertLink = () => {
    const url = window.prompt('Masukkan URL tautan:');
    if (!url) return;
    applyFormat('createLink', url);
  };

  const handlePickImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // supaya bisa pilih file yang sama dua kali berturut-turut
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const url = await uploadAnnouncementImage(file);
      applyFormat('insertImage', url);
    } catch (err) {
      showToast(err.message || 'Gagal mengunggah gambar.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ----- Jadwal tayang -----
  const handleDikirimChange = (value) => {
    setDikirimPada(value);
    if (!selesaiDiubahManual.current && value) {
      setSelesaiPada(toDatetimeLocalValue(plusDays(value, DEFAULT_MASA_TAYANG_HARI)));
    }
  };

  const handleSelesaiChange = (value) => {
    selesaiDiubahManual.current = true;
    setSelesaiPada(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isiText = editorRef.current?.innerText?.trim() || '';
    const { errors: newErrors, isValid, firstErrorMessage } = validateRequired([
      { field: 'judul', label: 'Judul pengumuman', value: judul },
      { field: 'isi', label: 'Isi berita', value: isiText },
    ]);
    if (!isValid) {
      setErrors(newErrors);
      showToast(firstErrorMessage);
      return;
    }
    if (!kirimSekarang && !dikirimPada) {
      setErrors((prev) => ({ ...prev, dikirimPada: true }));
      showToast('Tanggal & waktu pengiriman perlu diisi, atau centang "Kirim Sekarang".');
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      await onSubmit({
        judul,
        label,
        isi: editorRef.current?.innerHTML || '',
        // [BARU] "Kirim Sekarang" dicentang -> publishAt dikirim kosong,
        // backend otomatis mengisi waktu sekarang (lihat
        // NewsServiceImpl.applyDefaultSchedule()). Kalau tidak dicentang,
        // pakai tanggal & waktu yang dipilih HR di form.
        publishAt: kirimSekarang ? null : dikirimPada,
        expiresAt: selesaiPada || null,
      });
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="bg-[var(--color-primary)] px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white font-bold text-base">
            {isEditMode ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
          </h3>
          <button type="button" onClick={handleClose} className="text-white hover:opacity-70 text-lg leading-none">
            &times;
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
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
            {/* [UBAH] Opsi "Update (Hijau)" dihapus -- tinggal Penting & Info.
                Berita lama yang masih berlabel 'update' tetap tampil normal
                di AnnouncementSection (lihat getLabelStyle di
                announcementService.js), cuma tidak bisa dipilih lagi untuk
                berita baru/saat diedit (otomatis dialihkan ke Penting, lihat
                useEffect di atas). */}
            <Dropdown
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              options={[
                { value: 'penting', label: 'Penting (Merah)' },
                { value: 'info', label: 'Info (Biru)' },
              ]}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                Isi Berita
              </label>
            </div>

            {/* [BARU] Editor gaya blog: toolbar format teks + sisip gambar,
                menggantikan <textarea> polos. Konten disimpan sebagai HTML
                (kolom `content` di backend sudah TEXT, cukup besar). */}
            <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:border-[var(--color-primary)]">
              <div className="announcement-editor-toolbar flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
                <button type="button" onClick={() => applyFormat('bold')} title="Tebal" className="announcement-editor-btn"><b>B</b></button>
                <button type="button" onClick={() => applyFormat('italic')} title="Miring" className="announcement-editor-btn"><i>I</i></button>
                <button type="button" onClick={() => applyFormat('underline')} title="Garis Bawah" className="announcement-editor-btn"><u>U</u></button>
                <span className="w-px h-4 bg-gray-300 mx-1" />
                <button type="button" onClick={() => applyFormat('insertUnorderedList')} title="Daftar Poin" className="announcement-editor-btn">
                  <i className="fa-solid fa-list-ul"></i>
                </button>
                <button type="button" onClick={() => applyFormat('insertOrderedList')} title="Daftar Bernomor" className="announcement-editor-btn">
                  <i className="fa-solid fa-list-ol"></i>
                </button>
                <span className="w-px h-4 bg-gray-300 mx-1" />
                <button type="button" onClick={handleInsertLink} title="Sisipkan Tautan" className="announcement-editor-btn">
                  <i className="fa-solid fa-link"></i>
                </button>
                <button
                  type="button"
                  onClick={handlePickImage}
                  disabled={isUploadingImage}
                  title="Sisipkan Gambar"
                  className="announcement-editor-btn disabled:opacity-50"
                >
                  {isUploadingImage ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <><i className="fa-solid fa-image"></i> Gambar</>
                  )}
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageSelected}
                />
              </div>

              <div
                ref={editorRef}
                contentEditable
                onInput={() => { if (errors.isi) setErrors((prev) => ({ ...prev, isi: undefined })); }}
                data-placeholder="Tulis rincian pengumuman... gunakan toolbar di atas untuk format teks atau menyisipkan gambar."
                className={`announcement-editor-content ${errors.isi ? 'announcement-editor-content--error' : ''}`}
              />
            </div>
          </div>

          {/* [BARU] Opsi penayangan: kirim sekarang, atau jadwalkan kapan
              mulai & berhenti tampil. Default masa tayang 30 hari sejak
              dikirim (lihat DEFAULT_MASA_TAYANG_HARI & handleDikirimChange). */}
          <div className="border border-gray-200 rounded-lg p-3 flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={kirimSekarang}
                onChange={(e) => setKirimSekarang(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-primary)]"
              />
              Kirim Sekarang
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Dikirim
                </label>
                <input
                  type="datetime-local"
                  value={dikirimPada}
                  disabled={kirimSekarang}
                  onChange={(e) => handleDikirimChange(e.target.value)}
                  className={inputErrorClass(errors.dikirimPada, 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] disabled:bg-gray-50 disabled:text-gray-400')}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Selesai
                </label>
                <input
                  type="datetime-local"
                  value={selesaiPada}
                  onChange={(e) => handleSelesaiChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Default masa tayang {DEFAULT_MASA_TAYANG_HARI} hari sejak dikirim -- ubah "Selesai" kalau perlu tanggal lain.
            </p>
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
