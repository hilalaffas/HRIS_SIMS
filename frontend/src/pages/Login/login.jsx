// src/pages/Login/Login.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { loginUser } from '../../services/authService';
import AccountLocked from './AccountLocked';
import './Login.css';
import logoImage from '../../assets/sims_logo.png';
import { isEmpty } from '../../utils/validation';
import useI18n from '../../i18n/useI18n'; // [BARU]
import LanguageSwitcher from '../../components/LanguageSwitcher'; // [BARU]

const Login = ({ onLoginSuccess }) => {
  const { t, lang } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // [BARU] Menyimpan field mana yang kosong/salah, supaya Input yang
  // bersangkutan bisa ditandai border merah (prop `error` di Input.jsx).
  // Sebelumnya cuma ada 1 pesan gabungan ("Username dan password wajib
  // diisi.") tanpa tahu field mana yang sebenarnya kosong.
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showLockedScreen, setShowLockedScreen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // [UBAH] Pesan "wajib diisi" dibangun dari kamus i18n (bukan validateRequired,
    // yang pesannya hardcode Indonesia) -- aturan & urutan field tetap sama.
    const errors = {};
    if (isEmpty(username)) errors.username = t('login.required', { label: t('login.usernameLabel') });
    if (isEmpty(password)) errors.password = t('login.required', { label: t('login.passwordLabel') });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(errors.username || errors.password);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    try {
      const userData = await loginUser(username, password);
      onLoginSuccess(userData);
    } catch (err) {
      const message = err.message || t('login.fallbackError');

      // Backend mengirim pesan ini kalau akun sudah dinonaktifkan
      // (baik karena 3x gagal login, maupun dinonaktifkan manual oleh HR).
      if (message.toLowerCase().includes('dinonaktifkan')) {
        setShowLockedScreen(true);
      } else {
        // Pesan dari server berbahasa Indonesia; di mode lain pakai pesan generik.
        setError(err.message && lang !== 'id' ? t('login.fallbackError') : message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showLockedScreen) {
    return <AccountLocked onBack={() => setShowLockedScreen(false)} />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center p-4 font-sans">
      <LanguageSwitcher variant="floating" />
      <div className="sims-auth-card bg-white rounded-[24px] w-full max-w-[400px] p-8 shadow-2xl relative">
        
        {/* Logo area */}
        <div className="w-26 h-19 bg-gray-100 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-sm overflow-hidden">
          <span className="text-[#009A66] font-black text-2xl tracking-tighter flex">
            <img src={logoImage} alt={t('login.logoAlt')} width="100" />
          </span>
        </div>

        <h1 className="text-[22px] font-bold text-gray-900 text-center mb-1">
          SYS Indonesia
        </h1>
        <p className="text-[13px] text-gray-500 text-center mb-8">
          {t('login.subtitle')}
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            label={t('login.username')}
            id="username"
            placeholder={t('login.usernamePlaceholder')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={fieldErrors.username}
          />

          <Input
            label={t('login.password')}
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />

          <div className="text-right mt-2">
            <Link
              to="/forgot-password"
              className="text-[13px] font-bold text-[var(--color-primary)] hover:text-[#008256] hover:underline"
            >
              {t('login.forgot')}
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg mt-4 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <div className="mt-5">
            <Button type="submit" isLoading={isLoading}>
              {t('login.submit')}
            </Button>
          </div>
        </form>

        <div className="border-t border-gray-200 mt-8 pt-4 text-center">
          <p className="text-[11px] text-gray-400 font-medium">
            {t('login.copyright')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;