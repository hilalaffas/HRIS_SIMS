import { useState, useEffect, useRef } from 'react';

// Helper: ambil inisial dari nama lengkap, dipakai saat foto profil belum diupload
export const getInitials = (fullName) => {
  if (!fullName) return "AS";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Semua state & handler ProfilePageBase dikumpulkan di sini, supaya komponen
// tampilan (ProfileViewSection, ProfileEditModal, dll) cukup terima props saja.
export const useProfileForm = (currentUserRole, mockData) => {
  const [isEditing, setIsEditing] = useState(false); // Kontrol buka/tutup modal edit
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [chosenFileName, setChosenFileName] = useState('');
  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const toastTimer = useRef(null);

  // Data profil yang tampil di halaman (data tersimpan/final)
  const [formData, setFormData] = useState({
    namaLengkap: '',
    nikKaryawan: '',
    jabatan: '',
    alamatLengkap: '',
    email: '',
    nomorTelepon: '',
    divisi: '',
    tanggalBergabung: '',
    nomorTeleponDarurat: ''
  });

  // Data sementara yang diketik user di dalam form edit — belum tersimpan sampai klik "Simpan Perubahan"
  const [draftData, setDraftData] = useState(formData);

  // Form ganti kata sandi — terpisah dari data profil, dikosongkan tiap buka/tutup form edit
  const [passwordData, setPasswordData] = useState({
    kataSandiLama: '',
    kataSandiBaru: '',
    ulangiSandiBaru: ''
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Simulasi Fetch API dari Database — data awal berbeda per role, dikirim lewat prop `mockData`
    setFormData(mockData);
    setDraftData(mockData);

    const savedImage = localStorage.getItem(`user_profile_image_${currentUserRole}`);
    if (savedImage) {
      setProfileImage(savedImage);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserRole]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Buka form edit: salin data terbaru ke draft, kosongkan form kata sandi
  const openEdit = () => {
    setDraftData(formData);
    setPasswordData({ kataSandiLama: '', kataSandiBaru: '', ulangiSandiBaru: '' });
    setPasswordError('');
    setChosenFileName('');
    setIsEditing(true);
  };

  const closeEdit = () => setIsEditing(false);

  // Perubahan di form hanya mengubah draftData, bukan formData langsung
  const handleDraftChange = (e) => {
    const { name, value } = e.target;
    setDraftData({ ...draftData, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
    setPasswordError('');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setChosenFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfileImage(base64String);
        localStorage.setItem(`user_profile_image_${currentUserRole}`, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Simpan Perubahan ke Database
  const handleSave = (e) => {
    e.preventDefault();

    // Validasi kata sandi hanya jika user memang mengisinya
    const inginGantiSandi = passwordData.kataSandiBaru || passwordData.ulangiSandiBaru;
    if (inginGantiSandi) {
      if (!passwordData.kataSandiLama) {
        setPasswordError('Masukkan kata sandi lama untuk mengonfirmasi perubahan.');
        return;
      }
      if (passwordData.kataSandiBaru.length < 8) {
        setPasswordError('Kata sandi baru minimal 8 karakter.');
        return;
      }
      if (passwordData.kataSandiBaru !== passwordData.ulangiSandiBaru) {
        setPasswordError('Kata sandi baru dan pengulangannya tidak sama.');
        return;
      }
    }

    setSaving(true);
    // Simulasi panggilan API (ganti dengan axios.post / fetch ke backend Anda)
    setTimeout(() => {
      setFormData(draftData);
      console.log("Data baru berhasil disimpan ke DB:", draftData);
      if (inginGantiSandi) {
        console.log("Kata sandi diperbarui");
      }
      setSaving(false);
      setIsEditing(false);

      // Tampilkan toast notifikasi di kanan bawah
      setToast(true);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(false), 3500);
    }, 500);
  };

  return {
    isEditing, loading, profileImage, chosenFileName, toast, saving,
    fileInputRef, formData, draftData, passwordData, passwordError,
    openEdit, closeEdit, handleDraftChange, handlePasswordChange,
    handleImageChange, triggerFileInput, handleSave,
  };
};
