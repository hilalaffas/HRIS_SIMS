import React from 'react';

// Popup konfirmasi setelah user memilih foto baru dari ikon kamera di
// halaman baca. Menampilkan preview dulu — foto baru benar-benar
// diunggah ke server setelah tombol "Simpan Foto" ditekan.
const ProfileAvatarConfirmModal = ({ previewUrl, saving, error, onCancel, onConfirm }) => (
  <div className="profile-photo-viewer-overlay" onClick={saving ? undefined : onCancel}>
    <div className="profile-avatar-confirm-box" onClick={(e) => e.stopPropagation()}>
      <img src={previewUrl} alt="Preview foto profil" className="profile-avatar-confirm-img" />
      <p className="profile-avatar-confirm-text">Gunakan foto ini sebagai foto profil?</p>
      {error && <p className="profile-avatar-confirm-error">{error}</p>}
      <div className="profile-avatar-confirm-actions">
        <button
          type="button"
          className="btn-profile-cancel"
          onClick={onCancel}
          disabled={saving}
        >
          Batal
        </button>
        <button
          type="button"
          className="btn-profile-save"
          onClick={onConfirm}
          disabled={saving}
        >
          {saving ? 'Menyimpan...' : 'Simpan Foto'}
        </button>
      </div>
    </div>
  </div>
);

export default ProfileAvatarConfirmModal;
