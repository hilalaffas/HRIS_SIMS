import React, { useState } from 'react';

// Ikon mata (tampilkan/sembunyikan kata sandi)
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

// Satu input password + tombol mata untuk toggle tampil/sembunyikan
const PasswordInputWithToggle = ({ name, value, onChange, placeholder, autoComplete }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        type={visible ? 'text' : 'password'}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="form-input-profile"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        title={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
};

// Blok "Keamanan & Kata Sandi" di dalam form edit — opsional diisi, hanya divalidasi jika diisi.
const ProfilePasswordSection = ({ passwordData, passwordError, onChange }) => (
  <div className="profile-security-block">
    <h3 className="section-title">Keamanan & Kata Sandi</h3>
    <div className="info-group">
      <label>Kata Sandi Lama</label>
      <PasswordInputWithToggle
        name="kataSandiLama"
        value={passwordData.kataSandiLama}
        onChange={onChange}
        placeholder="Masukkan sandi saat ini"
        autoComplete="current-password"
      />
    </div>
    <div className="profile-password-grid">
      <div className="info-group">
        <label>Kata Sandi Baru</label>
        <PasswordInputWithToggle
          name="kataSandiBaru"
          value={passwordData.kataSandiBaru}
          onChange={onChange}
          placeholder="Kosongkan jika tidak ingin mengubah"
          autoComplete="new-password"
        />
      </div>
      <div className="info-group">
        <label>Ulangi Sandi Baru</label>
        <PasswordInputWithToggle
          name="ulangiSandiBaru"
          value={passwordData.ulangiSandiBaru}
          onChange={onChange}
          placeholder="Ketik ulang sandi baru"
          autoComplete="new-password"
        />
      </div>
    </div>
    {passwordError && <p className="profile-password-error">{passwordError}</p>}
  </div>
);

export default ProfilePasswordSection;
