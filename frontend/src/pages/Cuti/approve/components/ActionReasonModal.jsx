import React, { useEffect, useRef, useState } from 'react';
import './ActionReasonModal.css';

/**
 * ActionReasonModal.jsx
 * ------------------------------------------------------------------
 * Popup alasan yang muncul saat approver menekan tombol ACC, Revisi,
 * atau Tolak di ApproveSection. Approver WAJIB mengisi alasan/catatan
 * sebelum aksi benar-benar dieksekusi. Alasan ini nantinya masuk ke
 * `riwayatLog` milik permohonan terkait (lihat FormCuti > "Riwayat Log
 * Pemeriksaan Berjenjang").
 *
 * Props:
 *  - request: { item, action } | null
 *      item   -> data permohonan cuti (lihat bentuknya di mockData.js)
 *      action -> 'acc' | 'revisi' | 'tolak'
 *    Modal tidak dirender (return null) kalau request bernilai null.
 *  - onCancel: () => void
 *  - onSubmit: (id, action, alasan) => void
 * ------------------------------------------------------------------
 */

// Konfigurasi tampilan & label per jenis aksi.
// Diexport supaya ApproveLeave.jsx bisa pakai `statusValue` yang sama
// persis saat update `statusBerkas` & menulis `riwayatLog`, jadi tidak
// ada dua sumber kebenaran (single source of truth).
export const ACTION_CONFIG = {
  acc: {
    accent: 'acc',
    modalTitle: 'Setujui Permohonan Cuti',
    modalSubtitle: 'Konfirmasi persetujuan & tambahkan catatan untuk pemohon.',
    submitLabel: 'Ya, Setujui',
    placeholder: 'Contoh: Disetujui, pastikan pekerjaan sudah di-handover sebelum cuti.',
    helperText: 'Catatan ini akan tercatat di riwayat log berkas & terlihat oleh pemohon.',
    statusValue: 'DISETUJUI',
  },
  revisi: {
    accent: 'revisi',
    modalTitle: 'Kembalikan untuk Revisi',
    modalSubtitle: 'Jelaskan apa yang perlu dilengkapi/diperbaiki oleh pemohon.',
    submitLabel: 'Kembalikan',
    placeholder: 'Contoh: Mohon lampirkan surat pendukung terlebih dahulu.',
    helperText: 'Pemohon akan melihat catatan ini sebagai acuan revisi berkas.',
    statusValue: 'DIKEMBALIKAN',
  },
  tolak: {
    accent: 'tolak',
    modalTitle: 'Tolak Permohonan Cuti',
    modalSubtitle: 'Berikan alasan penolakan yang jelas untuk pemohon.',
    submitLabel: 'Ya, Tolak',
    placeholder: 'Contoh: Bertepatan dengan jadwal rilis, mohon ajukan tanggal lain.',
    helperText: 'Alasan penolakan wajib diisi agar pemohon memahami keputusan ini.',
    statusValue: 'DITOLAK',
  },
};

const MIN_ALASAN_LENGTH = 5;

const ActionReasonModal = ({ request, onCancel, onSubmit }) => {
  const [alasan, setAlasan] = useState('');
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef(null);

  const action = request?.action;
  const item = request?.item;
  const config = action ? ACTION_CONFIG[action] : null;

  // Reset isi form & fokus ke textarea setiap kali modal dibuka untuk
  // permohonan/aksi yang berbeda.
  useEffect(() => {
    if (request) {
      setAlasan('');
      setTouched(false);
      // Delay kecil supaya elemen sudah ter-mount sebelum di-fokus.
      const focusTimer = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(focusTimer);
    }
  }, [request]);

  // Tutup modal dengan tombol Escape.
  useEffect(() => {
    if (!request) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [request, onCancel]);

  if (!request || !config || !item) return null;

  const trimmedAlasan = alasan.trim();
  const isValid = trimmedAlasan.length >= MIN_ALASAN_LENGTH;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    onSubmit(item.id, action, trimmedAlasan);
  };

  return (
    <div className="action-reason__overlay" onMouseDown={onCancel}>
      <div
        className={`action-reason__modal action-reason__modal--${config.accent}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-reason-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="action-reason__header">
          <div>
            <h2 id="action-reason-title" className="action-reason__title">
              {config.modalTitle}
            </h2>
            <p className="action-reason__subtitle">{config.modalSubtitle}</p>
          </div>
          <button
            type="button"
            className="action-reason__closeIcon"
            aria-label="Tutup"
            onClick={onCancel}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="action-reason__body">
            <div className="action-reason__context">
              <span className="action-reason__contextName">{item.karyawan.nama}</span>
              <span className="action-reason__contextMeta">
                {item.jenisCuti} &middot; {item.durasi}
              </span>
            </div>

            <label className="action-reason__label" htmlFor="action-reason-textarea">
              Alasan / Catatan
            </label>
            <textarea
              id="action-reason-textarea"
              ref={textareaRef}
              className="action-reason__textarea"
              rows={4}
              value={alasan}
              placeholder={config.placeholder}
              onChange={(e) => setAlasan(e.target.value)}
              onBlur={() => setTouched(true)}
            />

            {touched && !isValid ? (
              <span className="action-reason__error">
                Alasan wajib diisi (minimal {MIN_ALASAN_LENGTH} karakter).
              </span>
            ) : (
              <span className="action-reason__helper">{config.helperText}</span>
            )}
          </div>

          <div className="action-reason__footer">
            <button type="button" className="action-reason__btnCancel" onClick={onCancel}>
              Batal
            </button>
            <button
              type="submit"
              className={`action-reason__btnSubmit action-reason__btnSubmit--${config.accent}`}
              disabled={!isValid}
            >
              {config.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionReasonModal;
