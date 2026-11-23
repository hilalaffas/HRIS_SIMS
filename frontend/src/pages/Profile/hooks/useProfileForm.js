import { useState, useEffect, useRef } from 'react';
import { changeMyPassword, getMyProfile, updateMyProfile } from '../../../services/profileService';
import { validatePhotoFile } from '../../../utils/fileValidation';
import { validateRequired, isValidPhoneNumber } from '../../../utils/validation';
import { FIELD_CONFIG, EMERGENCY_CONTACT_KEY } from '../config/profileFieldConfig';
import { getProfileChanges } from '../utils/profileChanges';

// Phone fields must contain a real number (not the "-" placeholder sent by the backend).
const PHONE_FIELD_KEYS = ['nomorTelepon', EMERGENCY_CONTACT_KEY];

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
  const saveLock = useRef(false);
  const [formData, setFormData] = useState({});
  const [draftData, setDraftData] = useState({});
  const [passwordData, setPasswordData] = useState({ kataSandiLama: '', kataSandiBaru: '', ulangiSandiBaru: '' });
  const [passwordError, setPasswordError] = useState('');
  // [BARU] fieldErrors: field profil (nama, telepon darurat, dll) mana yang
  // kosong -- dipakai buat border merah di ProfileFieldInput. formError:
  // pesan spesifik yang ditampilkan di atas tombol Simpan. passwordErrorField:
  // field password mana (lama/baru/ulangi) yang bermasalah, berdampingan
  // dengan `passwordError` (pesan teks) yang sudah ada.
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [passwordErrorField, setPasswordErrorField] = useState('');

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
    // [UBAH] Backend mengirim "-" untuk nomor yang belum diisi. Di form edit "-" dikosongkan
    // agar user melihat kolom kosong + pesan "perlu diisi", bukan tanda "-" yang lolos validasi.
    const initialDraft = { ...formData };
    PHONE_FIELD_KEYS.forEach((key) => { if (String(initialDraft[key] ?? '').trim() === '-') initialDraft[key] = ''; });
    setDraftData(initialDraft);
    setPasswordData({ kataSandiLama: '', kataSandiBaru: '', ulangiSandiBaru: '' });
    setPasswordError('');
    setPasswordErrorField('');
    setFieldErrors({});
    setFormError('');
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
  const handleDraftChange = (e) => {
    setDraftData({ ...draftData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setPasswordError('');
    setPasswordErrorField('');
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
    setFormError('');

    if (saveLock.current) return;
    const { changedFields, payload } = getProfileChanges(formData, draftData, currentUserRole);
    // Existing incomplete fields do not block unrelated edits or password changes.
    const requiredFieldRules = changedFields
      .filter((cfg) => cfg.required)
      .map((cfg) => ({
        field: cfg.key,
        label: cfg.label.replace(/\s*\*$/, ''),
        value: draftData[cfg.key],
        verb: cfg.select ? 'dipilih' : 'diisi',
      }));
    const { errors: requiredErrors, isValid, firstErrorMessage } = validateRequired(requiredFieldRules);
    if (!isValid) {
      setFieldErrors(requiredErrors);
      setFormError(firstErrorMessage);
      return;
    }

    // Changed phone numbers must be valid (8-15 digits); untouched legacy values do not block the save.
    const phoneErrors = {};
    PHONE_FIELD_KEYS.forEach((key) => {
      if (!changedFields.some((cfg) => cfg.key === key)) return;
      if (isValidPhoneNumber(draftData[key])) return;
      const label = FIELD_CONFIG.find((cfg) => cfg.key === key)?.label ?? key;
      phoneErrors[key] = `${label} tidak valid. Isi dengan 8-15 digit angka.`;
    });
    if (Object.keys(phoneErrors).length > 0) {
      setFieldErrors(phoneErrors);
      setFormError(Object.values(phoneErrors)[0]);
      return;
    }
    setFieldErrors({});

    const inginGantiSandi = Object.values(passwordData).some(Boolean);
    if (inginGantiSandi) {
      if (!passwordData.kataSandiLama) { setPasswordErrorField('kataSandiLama'); return setPasswordError('Masukkan kata sandi lama untuk mengonfirmasi perubahan.'); }
      if (passwordData.kataSandiBaru.length < 8) { setPasswordErrorField('kataSandiBaru'); return setPasswordError('Kata sandi baru minimal 8 karakter.'); }
      if (passwordData.kataSandiBaru !== passwordData.ulangiSandiBaru) { setPasswordErrorField('ulangiSandiBaru'); return setPasswordError('Kata sandi baru dan pengulangannya tidak sama.'); }
    }
    setPasswordErrorField('');
    setPasswordError('');
    if (!changedFields.length && !selectedPhoto && !inginGantiSandi) {
      setFormError('Belum ada perubahan untuk disimpan.');
      return;
    }
    saveLock.current = true;
    setSaving(true);
    try {
      if (changedFields.length || selectedPhoto) {
        const saved = await updateMyProfile(payload, selectedPhoto);
        // Keep successful profile edits if the separate password request fails.
        setFormData(saved);
        setDraftData(saved);
        setSelectedPhoto(null);
        setChosenFileName('');
        setProfileImage(saved.photoUrl || null);
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: saved }));
      }
      if (inginGantiSandi) {
        await changeMyPassword(passwordData.kataSandiLama, passwordData.kataSandiBaru, passwordData.ulangiSandiBaru);
        setPasswordData({ kataSandiLama: '', kataSandiBaru: '', ulangiSandiBaru: '' });
      }
      setIsEditing(false);
      setToast(true);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(false), 3500);
    } catch (error) {
      setFormError(error.message || 'Gagal menyimpan perubahan profil.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return { isEditing, loading, profileImage, chosenFileName, photoError, showPhotoViewer, pendingAvatarPreview, pendingAvatarFileValid: !!pendingAvatarFile, avatarSaving, avatarError, toast, saving, fileInputRef, formData, draftData, passwordData, passwordError, passwordErrorField, fieldErrors, formError, openEdit, closeEdit, handleDraftChange, handlePasswordChange, handleImageChange, handleAvatarFileSelected, confirmAvatarChange, cancelAvatarChange, triggerFileInput, openPhotoViewer, closePhotoViewer, handleSave };
};