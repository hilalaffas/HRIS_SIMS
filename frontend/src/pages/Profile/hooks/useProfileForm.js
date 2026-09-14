import { useState, useEffect, useRef } from 'react';
import { changeMyPassword, getMyProfile, updateMyProfile } from '../../../services/profileService';

export const getInitials = (fullName) => {
  if (!fullName) return 'AS';
  const parts = fullName.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].substring(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const useProfileForm = (currentUserRole, mockData) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [chosenFileName, setChosenFileName] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const toastTimer = useRef(null);
  const [formData, setFormData] = useState({});
  const [draftData, setDraftData] = useState({});
  const [passwordData, setPasswordData] = useState({ kataSandiLama: '', kataSandiBaru: '', ulangiSandiBaru: '' });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const profile = await getMyProfile();
        if (!active) return;
        setFormData(profile);
        setDraftData(profile);
        setProfileImage(profile.photoUrl || null);
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: profile }));
      } catch (error) {
        // Tetap tampilkan UI jika server belum aktif; data tidak akan tersimpan sampai API tersedia.
        if (active) {
          setFormData(mockData);
          setDraftData(mockData);
          console.error('Gagal memuat profil:', error);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadProfile();
    return () => { active = false; };
  }, [currentUserRole, mockData]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const openEdit = () => {
    setDraftData(formData);
    setPasswordData({ kataSandiLama: '', kataSandiBaru: '', ulangiSandiBaru: '' });
    setPasswordError('');
    setChosenFileName('');
    setSelectedPhoto(null);
    setIsEditing(true);
  };

  // Batal/close modal tanpa simpan harus membuang preview foto yang belum
  // di-upload. Tanpa ini, halaman profil sempat menampilkan foto yang belum
  // tersimpan (padahal sidebar tidak ikut berubah, karena event
  // 'profile-updated' cuma dikirim saat handleSave berhasil) — baru balik ke
  // foto asli setelah refresh. Reset ke formData.photoUrl di sini membuat
  // preview konsisten dengan data tersimpan begitu modal ditutup.
  const closeEdit = () => {
    setProfileImage(formData.photoUrl || null);
    setSelectedPhoto(null);
    setChosenFileName('');
    setIsEditing(false);
  };

  const openPhotoViewer = () => setShowPhotoViewer(true);
  const closePhotoViewer = () => setShowPhotoViewer(false);
  const handleDraftChange = (e) => setDraftData({ ...draftData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setPasswordError('');
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setChosenFileName(file.name);
    setSelectedPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result);
    reader.readAsDataURL(file);
  };

  // Input avatar pada halaman baca tidak memiliki tombol "Simpan". Karena itu
  // foto di jalur ini langsung diunggah, lalu sidebar ikut diperbarui.
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setProfileImage(previewUrl);
    window.dispatchEvent(new CustomEvent('profile-updated', {
      detail: { ...formData, photoUrl: previewUrl },
    }));
    try {
      const saved = await updateMyProfile({}, file);
      setFormData(saved);
      setDraftData(saved);
      setProfileImage(saved.photoUrl || null);
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: saved }));
    } catch (error) {
      setProfileImage(formData.photoUrl || null);
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: formData }));
      console.error('Gagal mengunggah foto profil:', error);
    } finally {
      URL.revokeObjectURL(previewUrl);
      e.target.value = '';
    }
  };
  const triggerFileInput = () => fileInputRef.current?.click();

  const handleSave = async (e) => {
    e.preventDefault();
    const inginGantiSandi = passwordData.kataSandiBaru || passwordData.ulangiSandiBaru;
    if (inginGantiSandi) {
      if (!passwordData.kataSandiLama) return setPasswordError('Masukkan kata sandi lama untuk mengonfirmasi perubahan.');
      if (passwordData.kataSandiBaru.length < 8) return setPasswordError('Kata sandi baru minimal 8 karakter.');
      if (passwordData.kataSandiBaru !== passwordData.ulangiSandiBaru) return setPasswordError('Kata sandi baru dan pengulangannya tidak sama.');
    }
    setSaving(true);
    try {
      const saved = await updateMyProfile({
        fullName: draftData.namaLengkap,
        address: draftData.alamatLengkap,
        email: draftData.email,
        phoneNumber: draftData.nomorTelepon,
        emergencyContactPhone: draftData.nomorTeleponDarurat,
        emergencyContactRelationship: draftData.hubunganDarurat,
      }, selectedPhoto);
      if (inginGantiSandi) {
        await changeMyPassword(passwordData.kataSandiLama, passwordData.kataSandiBaru, passwordData.ulangiSandiBaru);
      }
      setFormData(saved);
      setDraftData(saved);
      setProfileImage(saved.photoUrl || profileImage);
      // Sidebar membaca state user global. Kirim data terbaru agar avatar dan
      // nama di sidebar berubah tanpa reload halaman.
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: saved }));
      setIsEditing(false);
      setToast(true);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(false), 3500);
    } catch (error) {
      setPasswordError(error.message || 'Gagal menyimpan perubahan profil.');
    } finally {
      setSaving(false);
    }
  };

  return { isEditing, loading, profileImage, chosenFileName, showPhotoViewer, toast, saving, fileInputRef, formData, draftData, passwordData, passwordError, openEdit, closeEdit, handleDraftChange, handlePasswordChange, handleImageChange, handleAvatarChange, triggerFileInput, openPhotoViewer, closePhotoViewer, handleSave };
};