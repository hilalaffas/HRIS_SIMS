import { useState, useEffect, useRef } from 'react';
import { changeMyPassword, getMyProfile, updateMyProfile } from '../../../services/profileService';
import { validatePhotoFile } from '../../../utils/fileValidation';
import { validateRequired } from '../../../utils/validation';
import { FIELD_CONFIG } from '../config/profileFieldConfig';

// [BARU] Cek apakah field boleh diedit oleh role tertentu -- logikanya sama
// persis dengan isFieldEditable() di ProfilePageBase.jsx. Dipakai di
// handleSave supaya field yang terkunci (mis. namaLengkap utk non-HR-Admin)
// tidak ikut terkirim ke backend walau inputnya sempat ter-render disabled.
const isFieldEditableForRole = (fieldKey, role) => {
  const cfg = FIELD_CONFIG.find((field) => field.key === fieldKey);
  return !cfg?.lockedFor || !cfg.lockedFor.includes(role);
};

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
    setDraftData(formData);
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

    // [BARU] Field yang di FIELD_CONFIG ditandai required:true (mis. Nomor
    // Telepon Darurat, Hubungan) sudah lama dikasih label "*" tapi TIDAK
    // PERNAH benar-benar dicek sebelum disimpan. Sekarang dicek generik dari
    // config yang sama supaya label "*" dan validasinya selalu sinkron.
    const requiredFieldRules = FIELD_CONFIG
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
    setFieldErrors({});

    const inginGantiSandi = passwordData.kataSandiBaru || passwordData.ulangiSandiBaru;
    if (inginGantiSandi) {
      if (!passwordData.kataSandiLama) { setPasswordErrorField('kataSandiLama'); return setPasswordError('Masukkan kata sandi lama untuk mengonfirmasi perubahan.'); }
      if (passwordData.kataSandiBaru.length < 8) { setPasswordErrorField('kataSandiBaru'); return setPasswordError('Kata sandi baru minimal 8 karakter.'); }
      if (passwordData.kataSandiBaru !== passwordData.ulangiSandiBaru) { setPasswordErrorField('ulangiSandiBaru'); return setPasswordError('Kata sandi baru dan pengulangannya tidak sama.'); }
    }
    setPasswordErrorField('');
    setSaving(true);
    try {
      // [UBAH] fullName hanya disertakan kalau role ini memang boleh
      // mengedit namaLengkap (lihat isFieldEditableForRole di atas) --
      // proteksi ganda di sisi frontend selain kuncian di backend.
      const saved = await updateMyProfile({
        fullName: isFieldEditableForRole('namaLengkap', currentUserRole) ? draftData.namaLengkap : undefined,
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

  return { isEditing, loading, profileImage, chosenFileName, photoError, showPhotoViewer, pendingAvatarPreview, pendingAvatarFileValid: !!pendingAvatarFile, avatarSaving, avatarError, toast, saving, fileInputRef, formData, draftData, passwordData, passwordError, passwordErrorField, fieldErrors, formError, openEdit, closeEdit, handleDraftChange, handlePasswordChange, handleImageChange, handleAvatarFileSelected, confirmAvatarChange, cancelAvatarChange, triggerFileInput, openPhotoViewer, closePhotoViewer, handleSave };
};