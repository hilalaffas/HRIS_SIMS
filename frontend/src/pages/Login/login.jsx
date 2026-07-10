// src/pages/Login/Login.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { loginUser } from '../../services/authService';
import AccountLocked from './AccountLocked';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLockedScreen, setShowLockedScreen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      const userData = await loginUser(username, password);
      onLoginSuccess(userData);
    } catch (err) {
      const message = err.message || 'Username atau password salah.';

      // Backend mengirim pesan ini kalau akun sudah dinonaktifkan
      // (baik karena 3x gagal login, maupun dinonaktifkan manual oleh HR).
      if (message.toLowerCase().includes('dinonaktifkan')) {
        setShowLockedScreen(true);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showLockedScreen) {
    return <AccountLocked onBack={() => setShowLockedScreen(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#0A4D44] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-[24px] w-full max-w-[400px] p-8 shadow-2xl relative">
        
        {/* Logo area */}
        <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-sm overflow-hidden">
          <span className="text-[#009A66] font-black text-2xl tracking-tighter flex">
            <span className="inline-block letter-drop-0">S</span>
            <span className="inline-block letter-drop-1">I</span>
            <span className="inline-block letter-drop-2">M</span>
            <span className="inline-block letter-drop-3">S</span>
          </span>
        </div>

        <h1 className="text-[22px] font-bold text-gray-900 text-center mb-1">
          SYS Indonesia
        </h1>
        <p className="text-[13px] text-gray-500 text-center mb-8">
          Sistem Informasi Manajemen Cuti Karyawan
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            label="USERNAME"
            id="username"
            placeholder="username.anda"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            label="PASSWORD"
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="text-right mt-2">
            <Link
              to="/forgot-password"
              className="text-[13px] font-bold text-[#0A4D44] hover:text-[#008256] hover:underline"
            >
              Lupa Sandi?
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg mt-4 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <div className="mt-5">
            <Button type="submit" isLoading={isLoading}>
              Login
            </Button>
          </div>
        </form>

        <div className="border-t border-gray-200 mt-8 pt-4 text-center">
          <p className="text-[11px] text-gray-400 font-medium">
            © 2026 SYS Indonesia. Hak Cipta Dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;