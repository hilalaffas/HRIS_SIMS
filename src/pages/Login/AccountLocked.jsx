// src/pages/Login/AccountLocked.jsx
import React from 'react';

const AccountLocked = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#0A4D44] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-[24px] w-full max-w-[400px] p-8 shadow-2xl border-4 border-[#0A4D44] text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full mx-auto flex items-center justify-center mb-6">
          <svg
            className="w-9 h-9 text-red-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <h1 className="text-[20px] font-bold text-gray-900 mb-3">
          Akun Telah dinonaktifkan
        </h1>

        <p className="text-[13px] text-gray-500 leading-relaxed mb-7">
          Anda telah melakukan kesalahan memasukan password sebanyak 3 (tiga)
          kali. Silakan tunggu selama maksimal 3 (tiga) hari kerja. Hubungi HR
          secara langsung jika butuh akses segera.
        </p>

        <button
          type="button"
          onClick={onBack}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[14px] py-3 rounded-xl transition-colors"
        >
          Kembali ke Halaman Login
        </button>
      </div>
    </div>
  );
};

export default AccountLocked;
