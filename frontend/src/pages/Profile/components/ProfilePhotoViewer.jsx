import React from 'react';

// Popup/lightbox untuk melihat foto profil dalam ukuran penuh.
// Ditutup dengan klik area gelap di luar foto, atau tombol close.
const ProfilePhotoViewer = ({ photoUrl, altText, onClose }) => (
  <div className="profile-photo-viewer-overlay" onClick={onClose}>
    <button
      type="button"
      className="profile-photo-viewer-close"
      onClick={onClose}
      aria-label="Tutup"
    >
      ✕
    </button>
    <img
      src={photoUrl}
      alt={altText}
      className="profile-photo-viewer-img"
      onClick={(e) => e.stopPropagation()}
    />
  </div>
);

export default ProfilePhotoViewer;
