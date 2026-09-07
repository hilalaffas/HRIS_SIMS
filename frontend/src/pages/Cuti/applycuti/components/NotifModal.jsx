import React from 'react';
import './NotifModal.css';

/**
 * NotifModal.jsx
 * ------------------------------------------------------------------
 * Popup notifikasi generik untuk SELURUH pesan (error, peringatan,
 * sukses, info) di alur pengajuan & persetujuan cuti.
 *
 * Menggantikan 2 pola lama yang tersebar dan tidak konsisten:
 *   1. Kotak inline (mis. `.empty-history-box`, `.approvalSection__empty`)
 *      di atas formulir -- gampang tidak disadari karena tidak
 *      menghalangi apa pun, dan kalau formnya panjang, user harus
 *      scroll ke atas dulu untuk lihat pesannya.
 *   2. `window.alert(...)` bawaan browser -- muncul di tempat, TAPI
 *      tampilannya tidak konsisten dengan desain SIMS dan tidak bisa
 *      di-styling.
 *
 * Sekarang SEMUA pesan (sukses maupun error) tampil sebagai popup
 * modal (overlay + card) di tengah layar, tidak peduli sejauh mana
 * posisi scroll user, dan WAJIB ditutup lewat tombol "OK".
 *
 * Props:
 *  - type: 'error' | 'warning' | 'success' | 'info' (default: 'error')
 *      Menentukan warna & ikon. 'error'/'warning' = merah/kuning,
 *      'success' = hijau, 'info' = biru.
 *  - title: string (opsional) -> override judul default per type
 *      ("Perhatian" / "Berhasil" / "Informasi").
 *  - message: string -> isi pesan. Modal hanya dirender kalau
 *      message berisi (truthy), jadi pemanggil cukup:
 *      `<NotifModal type="error" message={error} onClose={() => setError('')} />`
 *  - onClose: () => void -> dipanggil saat tombol "OK" / klik area
 *      luar card diklik. Isi dengan setter yang mengosongkan pesan
 *      di state komponen induk (mis. `() => setError('')`).
 * ------------------------------------------------------------------
 */
const DEFAULT_TITLE = {
  error: 'Perhatian',
  warning: 'Perhatian',
  success: 'Berhasil',
  info: 'Informasi',
};

const ICONS = {
  error: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v5" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16h.01" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
      />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11v5m0-8h.01" />
    </svg>
  ),
};

const NotifModal = ({ type = 'error', title, message, onClose }) => {
  if (!message) return null;
  const resolvedType = ICONS[type] ? type : 'error';
  const resolvedTitle = title || DEFAULT_TITLE[resolvedType];

  return (
    <div className="notifModal__overlay" onClick={onClose} role="presentation">
      <div
        className={`notifModal__card notifModal__card--${resolvedType}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notifModal-title"
        aria-describedby="notifModal-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`notifModal__iconWrap notifModal__iconWrap--${resolvedType}`}>
          <span className={`notifModal__icon notifModal__icon--${resolvedType}`}>
            {ICONS[resolvedType]}
          </span>
        </div>

        <h3 id="notifModal-title" className="notifModal__title">
          {resolvedTitle}
        </h3>
        <p id="notifModal-desc" className="notifModal__text">
          {message}
        </p>

        <button
          type="button"
          className={`notifModal__btnOk notifModal__btnOk--${resolvedType}`}
          onClick={onClose}
          autoFocus
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default NotifModal;
