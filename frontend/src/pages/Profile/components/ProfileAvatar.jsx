import React from 'react';

// Lingkaran foto profil (mode baca) — klik untuk ganti foto, ada overlay ikon kamera saat hover
const ProfileAvatar = ({ profileImage, initials, onTrigger, fileInputRef, onImageChange }) => (
  <>
    <div className="profile-avatar-large" onClick={onTrigger} title="Ubah Foto Profil">
      {profileImage ? (
        <img src={profileImage} alt="Profile" className="profile-avatar-img" />
      ) : (
        <span>{initials}</span>
      )}
      <div className="profile-avatar-hover-overlay">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      </div>
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

export default ProfileAvatar;
