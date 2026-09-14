import React from 'react';

// Lingkaran foto profil (mode baca).
// - Klik pada foto: buka popup lihat foto ukuran penuh (kalau sudah ada foto).
//   Kalau belum ada foto (masih inisial), klik langsung buka pemilih file.
// - Klik ikon kamera (overlay saat hover): buka pemilih file untuk ganti foto.
const ProfileAvatar = ({ profileImage, initials, onTrigger, onView, fileInputRef, onImageChange }) => {
  const handleAvatarClick = () => {
    if (profileImage) {
      onView();
    } else {
      onTrigger();
    }
  };

  const handleCameraClick = (e) => {
    e.stopPropagation();
    onTrigger();
  };

  return (
    <>
      <div
        className="profile-avatar-large"
        onClick={handleAvatarClick}
        title={profileImage ? 'Lihat Foto Profil' : 'Ubah Foto Profil'}
      >
        {profileImage ? (
          <img src={profileImage} alt="Profile" className="profile-avatar-img" />
        ) : (
          <span>{initials}</span>
        )}
        <button
          type="button"
          className="profile-avatar-hover-overlay"
          onClick={handleCameraClick}
          title="Ubah Foto Profil"
          aria-label="Ubah Foto Profil"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onImageChange}
        accept="image/*"
        className="profile-avatar-file-input"
      />
    </>
  );
};

export default ProfileAvatar;
