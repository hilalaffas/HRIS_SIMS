import React from 'react';

// Toast notifikasi kecil di kanan bawah, muncul setelah simpan berhasil
const ProfileToast = ({ show }) => (
  <div className={`profile-toast ${show ? 'profile-toast-show' : ''}`}>
    <span className="profile-toast-icon">✓</span>
    <p className="profile-toast-text">Data profil berhasil diperbarui!</p>
  </div>
);

export default ProfileToast;
