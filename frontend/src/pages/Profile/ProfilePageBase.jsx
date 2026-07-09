import React from 'react';
import './styles/profile.css';
import { FIELD_CONFIG } from './config/profileFieldConfig';
import { useProfileForm } from './hooks/useProfileForm';
import ProfileViewSection from './components/ProfileViewSection';
import ProfileEditModal from './components/ProfileEditModal';
import ProfileToast from './components/ProfileToast';

// Komponen inti — dipakai bersama oleh ProfileStaff, ProfileSPV, ProfileManager, ProfileAdmin.
// Semua logic/state ada di hook `useProfileForm`. Tampilan dipecah jadi:
//   - ProfileViewSection : mode baca (banner, avatar, nama, grid info)
//   - ProfileEditModal   : mode edit (popup form, termasuk ProfileFieldInput & ProfilePasswordSection)
//   - ProfileToast       : notifikasi setelah simpan
// Yang beda per role hanya: `currentUserRole` (untuk aturan lock field) dan `mockData` (data profil awal).
const ProfilePageBase = ({ currentUserRole, mockData }) => {
  // Helper: cek apakah field boleh diedit oleh role yang sedang login
  const isFieldEditable = (cfg) => !cfg.lockedFor || !cfg.lockedFor.includes(currentUserRole);

  const {
    isEditing, loading, profileImage, chosenFileName, toast, saving,
    fileInputRef, formData, draftData, passwordData, passwordError,
    openEdit, closeEdit, handleDraftChange, handlePasswordChange,
    handleImageChange, triggerFileInput, handleSave,
  } = useProfileForm(currentUserRole, mockData);

  if (loading) return <div className="profile-loading">Memuat data...</div>;

  const kolomKiri = FIELD_CONFIG.filter((f) => f.column === 'kiri');
  const kolomKanan = FIELD_CONFIG.filter((f) => f.column === 'kanan');

  return (
    <div className="profile-page-container">
      {/* ===== MODE BACA ===== */}
      {!isEditing && (
        <ProfileViewSection
          formData={formData}
          profileImage={profileImage}
          fileInputRef={fileInputRef}
          onImageChange={handleImageChange}
          onTriggerFileInput={triggerFileInput}
          onOpenEdit={openEdit}
          kolomKiri={kolomKiri}
          kolomKanan={kolomKanan}
          isFieldEditable={isFieldEditable}
        />
      )}

      {/* ===== MODE EDIT — popup/modal ===== */}
      {isEditing && (
        <ProfileEditModal
          closeEdit={closeEdit}
          handleSave={handleSave}
          saving={saving}
          chosenFileName={chosenFileName}
          handleImageChange={handleImageChange}
          kolomKiri={kolomKiri}
          kolomKanan={kolomKanan}
          draftData={draftData}
          handleDraftChange={handleDraftChange}
          isFieldEditable={isFieldEditable}
          passwordData={passwordData}
          passwordError={passwordError}
          handlePasswordChange={handlePasswordChange}
        />
      )}

      <ProfileToast show={toast} />
    </div>
  );
};

export default ProfilePageBase;
