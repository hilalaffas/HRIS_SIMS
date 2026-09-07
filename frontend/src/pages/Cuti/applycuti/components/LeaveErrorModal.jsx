import React from 'react';
import './LeaveErrorModal.css';

/**
 * LeaveErrorModal.jsx
 * ------------------------------------------------------------------
 * Popup notifikasi error/peringatan untuk halaman ApplyCuti.
 *
 * Sebelumnya pesan error (mis. "Tanggal cuti tidak sesuai dengan
 * ketentuan pengajuan.") ditampilkan sebagai kotak inline biasa
 * (`.empty-history-box`) di atas formulir -- gampang tidak disadari
 * user karena tidak menghalangi interaksi apa pun dan bisa
 * "tenggelam" di antara elemen lain di halaman.
 *
 * Sekarang ditampilkan sebagai popup modal (overlay + card) yang
 * WAJIB ditutup lewat tombol "OK", supaya user pasti sadar ada
 * kesalahan sebelum melanjutkan mengisi formulir.
 *
 * Props:
 *  - message: string   -> isi pesan error/peringatan. Modal hanya
 *      dirender kalau message berisi (truthy), jadi pemanggil cukup
 *      lakukan `{error && <LeaveErrorModal message={error} onClose={...} />}`
 *      atau langsung `<LeaveErrorModal message={error} onClose={...} />`.
 *  - onClose: () => void -> dipanggil saat tombol "OK" / overlay diklik.
 *      Sebaiknya diisi `() => setError('')` di komponen induk.
 */
const LeaveErrorModal = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div
      className="leaveErrorModal__overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="leaveErrorModal__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leaveErrorModal-title"
        aria-describedby="leaveErrorModal-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="leaveErrorModal__iconWrap">
          <svg viewBox="0 0 24 24" fill="none" className="leaveErrorModal__icon">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v5" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16h.01" />
          </svg>
        </div>

        <h3 id="leaveErrorModal-title" className="leaveErrorModal__title">
          Perhatian
        </h3>
        <p id="leaveErrorModal-desc" className="leaveErrorModal__text">
          {message}
        </p>

        <button
          type="button"
          className="leaveErrorModal__btnOk"
          onClick={onClose}
          autoFocus
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default LeaveErrorModal;
