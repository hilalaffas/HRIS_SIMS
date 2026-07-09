import React from 'react';
import ProfileAvatar from './ProfileAvatar';
import { getInitials } from '../hooks/useProfileForm';
import { EMERGENCY_CONTACT_KEY, EMERGENCY_RELATION_KEY } from '../config/profileFieldConfig';

// Tampilan MODE BACA — banner hijau, foto, nama/NIK, tombol edit, dan grid info profil.
const ProfileViewSection = ({
  formData, profileImage, fileInputRef, onImageChange, onTriggerFileInput,
  onOpenEdit, kolomKiri, kolomKanan, isFieldEditable,
}) => (
  <>
    <div className="profile-banner-top"></div>

    <div className="profile-card-content">
      <div className="profile-header-block">
        <ProfileAvatar
          profileImage={profileImage}
          initials={getInitials(formData.namaLengkap)}
          onTrigger={onTriggerFileInput}
          fileInputRef={fileInputRef}
          onImageChange={onImageChange}
        />

        <div className="profile-title-wrapper">
          <h2 className="profile-main-name">{formData.namaLengkap}</h2>
          <p className="profile-main-nik">NIK/ID Karyawan: {formData.nikKaryawan}</p>
        </div>

        <button className="btn-edit-data" onClick={onOpenEdit}>
          Edit Data Profil
        </button>
      </div>

      <div className="profile-info-grid">
        <div className="info-column">
          <h3 className="section-title">Informasi Umum</h3>
          {kolomKiri.map((cfg) => (
            <div className="info-group" key={cfg.key}>
              <label>{cfg.label}</label>
              <p className={!isFieldEditable(cfg) ? 'text-readonly' : ''}>{formData[cfg.key]}</p>
            </div>
          ))}
        </div>
        <div className="info-column">
          <h3 className="section-title">Informasi Kontak & Pekerjaan</h3>
          {['email', 'nomorTelepon', EMERGENCY_CONTACT_KEY, 'divisi', 'tanggalBergabung'].map((key) => {
            const cfg = kolomKanan.find((c) => c.key === key);
            if (!cfg) return null;

            if (cfg.key === EMERGENCY_CONTACT_KEY) {
              const relationCfg = kolomKanan.find((c) => c.key === EMERGENCY_RELATION_KEY);
              const relationValue = relationCfg && formData[relationCfg.key];
              return (
                <div className={`info-group ${cfg.required ? 'emergency-contact' : ''}`} key={cfg.key}>
                  <label>{cfg.label}</label>
                  <p className={!isFieldEditable(cfg) ? 'text-readonly' : ''}>
                    {formData[cfg.key]}
                    {relationValue && <span className="text-muted-inline"> ({relationValue})</span>}
                  </p>
                </div>
              );
            }

            return (
              <div className={`info-group ${cfg.required ? 'emergency-contact' : ''}`} key={cfg.key}>
                <label>{cfg.label}</label>
                <p className={!isFieldEditable(cfg) ? 'text-readonly' : ''}>{formData[cfg.key]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </>
);

export default ProfileViewSection;
