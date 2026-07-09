// src/pages/ForgotPassword/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { checkUsernameExists, requestPasswordReset } from '../../services/authService';

const TOAST_DURATION = 3000;

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  const showErrorToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, TOAST_DURATION);
  };

  // Step 1: validasi username sebelum menampilkan konfirmasi
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim()) {
      showErrorToast('Username wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      const exists = await checkUsernameExists(identifier);
      if (!exists) {
        showErrorToast('Username tidak ditemukan di database.');
        return;
      }
      setShowConfirm(true);
    } catch (err) {
      showErrorToast(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: setelah dikonfirmasi, kirim permintaan reset sesungguhnya
  const handleConfirmReset = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    try {
      await requestPasswordReset(identifier);
      setIsSubmitted(true);
    } catch (err) {
      showErrorToast(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A4D44] flex items-center justify-center p-4 font-sans relative">

      {/* Toast notifikasi error, pojok kanan bawah */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-100 bg-[#b91c1c] text-white px-5 py-3 rounded-lg shadow-xl text-[13px] font-semibold flex items-center gap-2 max-w-[320px]">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          {toast.message}
        </div>
      )}

      {/* Modal konfirmasi reset sandi */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-105 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth="2"></circle>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12" y2="17.01" strokeWidth="2.5" strokeLinecap="round"></line>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Konfirmasi Reset Sandi</h3>
              </div>
              <p className="text-gray-500 text-[13.5px] mb-6 ml-13 leading-relaxed">
                Apakah benar Anda ingin mereset password?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 text-sm"
                >
                  Tidak
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="px-5 py-2.5 bg-[#009A66] text-white font-semibold rounded-lg hover:bg-[#008256] text-sm shadow-sm"
                >
                  Ya
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl w-full max-w-100 p-8 shadow-2xl relative">

        {!isSubmitted ? (
          <>
            {/* Icon area */}
            <div className="w-16 h-16 bg-[#FEF3C7] rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-sm">
              <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="9" rx="2" strokeWidth="2"></rect>
                <path strokeLinecap="round" d="M8 11V7a4 4 0 0 1 8 0v4" strokeWidth="2"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.5 14.75a1.5 1.5 0 1 1 2 1.41c-.5.2-.9.6-.9 1.09"></path>
                <line x1="12" y1="18.2" x2="12" y2="18.21" strokeWidth="2.5" strokeLinecap="round"></line>
              </svg>
            </div>

            <h1 className="text-[22px] font-bold text-gray-900 text-center mb-1">
              Lupa Sandi
            </h1>
            <p className="text-[13px] text-gray-500 text-center mb-8 leading-relaxed">
              Sistem akan memproses penyetelan ulang sandi Anda.
            </p>

            <form onSubmit={handleSubmit}>
              <Input
                label="USERNAME ANDA"
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />

              <div className="mt-6">
                <Button type="submit" isLoading={isLoading}>
                  Kirim Permintaan Reset Sandi
                </Button>
              </div>
            </form>

            <div className="border-t border-gray-200 mt-8 pt-5 text-center">
              <Link
                to="/login"
                className="text-[13px] font-bold text-gray-500 hover:text-[#0A4D44]"
              >
                &larr; Kembali ke Login
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-[#d1fae5] rounded-full mx-auto flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-[#0A4D44]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 mb-3 leading-snug">
              Berhasil Meminta Reset Kata Sandi
            </h1>
            <p className="text-[13px] text-gray-500 mb-8 leading-relaxed">
              Notifikasi telah dikirimkan ke HR Admin. Silakan hubungi HR secara langsung jika butuh akses segera.
            </p>
            <Link
              to="/login"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Kembali ke Halaman Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
