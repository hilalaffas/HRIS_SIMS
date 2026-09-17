import { useState, useEffect, useRef } from 'react';
import { changeMyPassword, getMyProfile, updateMyProfile } from '../../../services/profileService';
import { validatePhotoFile } from '../../../utils/fileValidation';

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
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [photoError, setPhotoError] = useState('');
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
    setPhotoError('');
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
    setPhotoError('');
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

    const validationError = validatePhotoFile(file);
    if (validationError) {
      setPhotoError(validationError);
      e.target.value = ''; // reset input supaya user bisa pilih ulang
      setChosenFileName('');
      setSelectedPhoto(null);
      return;
    }

    setPhotoError('');
    setChosenFileName(file.name);
    setSelectedPhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result);
    reader.readAsDataURL(file);
  };

  // Input avatar pada halaman baca (ikon kamera). Dulu file yang dipilih
  // langsung diunggah ke server tanpa konfirmasi. Sekarang hanya menyiapkan
  // preview lokal dulu — upload sebenarnya baru terjadi setelah user
  // menekan "Simpan Foto" di popup konfirmasi (lihat confirmAvatarChange).
  const handleAvatarFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validationError = validatePhotoFile(file);
    if (validationError) {
      // Tetap tampilkan preview + pesan error di modal konfirmasi, tapi
      // pendingAvatarFile sengaja dikosongkan supaya tombol "Simpan Foto"
      // tidak mengunggah file yang tidak valid (lihat confirmAvatarChange).
      setAvatarError(validationError);
      setPendingAvatarFile(null);
      setPendingAvatarPreview(URL.createObjectURL(file));
      return;
    }

    setAvatarError('');
    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
  };

  const cancelAvatarChange = () => {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setAvatarError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmAvatarChange = async () => {
    if (!pendingAvatarFile) return;
    setAvatarSaving(true);
    setAvatarError('');
    try {
      const saved = await updateMyProfile({}, pendingAvatarFile);
      setFormData(saved);
      setDraftData(saved);
      setProfileImage(saved.photoUrl || null);
      // Sidebar baru diberitahu setelah upload benar-benar sukses.
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: saved }));
      cancelAvatarChange();
    } catch (error) {
      setAvatarError(error.message || 'Gagal mengunggah foto profil.');
    } finally {
      setAvatarSaving(false);
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

  return { isEditing, loading, profileImage, chosenFileName, photoError, showPhotoViewer, pendingAvatarPreview, pendingAvatarFileValid: !!pendingAvatarFile, avatarSaving, avatarError, toast, saving, fileInputRef, formData, draftData, passwordData, passwordError, openEdit, closeEdit, handleDraftChange, handlePasswordChange, handleImageChange, handleAvatarFileSelected, confirmAvatarChange, cancelAvatarChange, triggerFileInput, openPhotoViewer, closePhotoViewer, handleSave };
};