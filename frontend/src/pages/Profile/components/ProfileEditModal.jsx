import React from 'react';
import ProfileFieldInput from './ProfileFieldInput';
import ProfilePasswordSection from './ProfilePasswordSection';
import { EMERGENCY_CONTACT_KEY, EMERGENCY_RELATION_KEY } from '../config/profileFieldConfig';
import { PHOTO_INPUT_ACCEPT } from '../../../utils/fileValidation';

// Tampilan MODE EDIT — muncul sebagai popup/modal di atas halaman.
// Berisi: upload foto, grid field kiri/kanan, section kata sandi, tombol aksi.
const ProfileEditModal = ({
  closeEdit, handleSave, saving, chosenFileName, photoError, handleImageChange,
  kolomKiri, kolomKanan, draftData, handleDraftChange, isFieldEditable,
  fieldErrors = {}, formError,
  passwordData, passwordError, passwordErrorField, handlePasswordChange,
}) => (
  <div className="profile-edit-overlay" onClick={closeEdit}>
    <div className="profile-edit-page" onClick={(e) => e.stopPropagation()}>
      <div className="profile-edit-header">
        <div>
          <h3>Edit Data Profil</h3>
          <p>Perbarui informasi personal, kontak, dan alamat Anda</p>
        </div>
        <button type="button" className="profile-edit-close" onClick={closeEdit} aria-label="Tutup">
          ✕
        </button>
      </div>

      <form onSubmit={handleSave}>
        <div className="profile-edit-body">
          <div className="profile-edit-section">
            <h3 className="section-title-edit">Informasi Umum</h3>

            {/* Foto Profil — kotak berisi tombol kustom + nama file, input asli disembunyikan */}
            <div className="info-group info-group-full">
              <label>Foto Profil</label>
              <div className="profile-photo-picker">
                <label htmlFor="fotoProfilInput" className="profile-photo-button">
                  Choose File
                </label>
                <span className="profile-photo-filename">
                  {chosenFileName || 'No file chosen'}
                </span>
                <input
                  id="fotoProfilInput"
                  type="file"
                  accept={PHOTO_INPUT_ACCEPT}
                  onChange={handleImageChange}
                  className="profile-photo-input-hidden"
                />
              </div>
              {photoError && <p className="profile-photo-error">{photoError}</p>}
            </div>

            <div className="profile-edit-grid">
              {kolomKiri.map((cfg) => (
                <ProfileFieldInput
                  key={cfg.key}
                  cfg={cfg}
                  value={draftData[cfg.key]}
                  onChange={handleDraftChange}
                  editable={isFieldEditable(cfg)}
                  error={fieldErrors[cfg.key]}
                />
              ))}
            </div>
          </div>

          <div className="profile-edit-section">
            <h3 className="section-title-edit">Informasi Kontak & Pekerjaan</h3>
            <div className="profile-edit-grid">
              {kolomKanan.map((cfg) => {
                // Field "Hubungan" digabung tampil satu baris bersama Nomor Telepon Darurat,
                // jadi tidak perlu dirender sebagai item grid tersendiri di sini.
                if (cfg.key === EMERGENCY_RELATION_KEY) return null;

                if (cfg.key === EMERGENCY_CONTACT_KEY) {
                  const relationCfg = kolomKanan.find((c) => c.key === EMERGENCY_RELATION_KEY);
                  return (
                    <div className="info-group-darurat-hubungan" key={cfg.key}>
                      <ProfileFieldInput
                        cfg={cfg}
                        value={draftData[cfg.key]}
                        onChange={handleDraftChange}
                        editable={isFieldEditable(cfg)}
                        error={fieldErrors[cfg.key]}
                      />
                      {relationCfg && (
                        <ProfileFieldInput
                          cfg={relationCfg}
                          value={draftData[relationCfg.key]}
                          onChange={handleDraftChange}
                          editable={isFieldEditable(relationCfg)}
                          error={fieldErrors[relationCfg.key]}
                        />
                      )}
                    </div>
                  );
                }

                return (
                  <ProfileFieldInput
                    key={cfg.key}
                    cfg={cfg}
                    value={draftData[cfg.key]}
                    onChange={handleDraftChange}
                    editable={isFieldEditable(cfg)}
                    error={fieldErrors[cfg.key]}
                  />
                );
              })}
            </div>
          </div>

          <ProfilePasswordSection
            passwordData={passwordData}
            passwordError={passwordError}
            errorField={passwordErrorField}
            onChange={handlePasswordChange}
          />

          {/* [BARU] Pesan spesifik untuk field wajib di grid atas (mis. "Nomor
              Telepon Darurat (Urgent) perlu diisi.") -- field config sudah
              lama menandai beberapa field dengan "*" tapi belum pernah
              benar-benar divalidasi/ditampilkan pesannya. */}
          {formError && <p className="profile-password-error">{formError}</p>}

          <div className="profile-action-group">
            <button type="button" className="btn-profile-cancel" onClick={closeEdit}>
              Batal
            </button>
            <button type="submit" className="btn-profile-save" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
);

export default ProfileEditModal;
