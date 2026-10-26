// src/pages/Pengajuan/components/ShiftSwapModal.jsx
//
// Popup "Pengajuan Tukar Shift" -- TAMPILAN SEMENTARA (belum terhubung backend).
// Pilih jadwal sendiri yang akan ditukar, pilih rekan pengganti, isi alasan,
// lalu kirim. Pengiriman diserahkan ke parent lewat `onSubmit(values)`; daftar
// pilihan datang dari `shiftOptions` & `colleagueOptions` (sementara dari
// data/mockShiftSwap.js).
//
// Contoh pemakaian:
// <ShiftSwapModal shiftOptions={...} colleagueOptions={...} onSubmit={fn} onClose={fn} />
import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import { DropdownPortalContext } from '../../../components/DropdownPortalContext';
import useModalExit from '../../../hooks/useModalExit';
import './ShiftSwapModal.css';

const EMPTY_FORM = { myShift: '', colleague: '', reason: '' };

export default function ShiftSwapModal({ shiftOptions, colleagueOptions, onSubmit, onClose }) {
  const { closing, close } = useModalExit();
  const [form, setForm] = useState(EMPTY_FORM);
  const [invalidField, setInvalidField] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close(onClose);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, onClose]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setInvalidField('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const firstEmpty = ['myShift', 'colleague', 'reason'].find((field) => !String(form[field]).trim());
    if (firstEmpty) {
      setInvalidField(firstEmpty);
      return;
    }
    onSubmit(form);
  };

  return (
    <div className={`pgj-swap-overlay${closing ? ' is-closing' : ''}`} onMouseDown={() => close(onClose)}>
      <form
        className="pgj-swap-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pgj-swap-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <header className="pgj-swap-header">
          <h2 id="pgj-swap-title">
            <ArrowLeftRight aria-hidden="true" />
            Pengajuan Tukar Shift
          </h2>
          <button type="button" aria-label="Tutup" onClick={() => close(onClose)}>
            <X aria-hidden="true" />
          </button>
        </header>

        <DropdownPortalContext.Provider value>
          <div className="pgj-swap-body">
            <div className="pgj-swap-field">
              <label htmlFor="swap-my-shift">Pilih Jadwal Anda (Akan Ditukar)</label>
              <Dropdown
                id="swap-my-shift"
                variant="form"
                value={form.myShift}
                onChange={(event) => updateField('myShift', event.target.value)}
                options={shiftOptions}
                placeholder="-- Pilih Jadwal Anda --"
                className={invalidField === 'myShift' ? 'dropdown--invalid' : ''}
                ariaLabel="Pilih jadwal Anda yang akan ditukar"
              />
            </div>

            <div className="pgj-swap-field">
              <label htmlFor="swap-colleague">Pilih Rekan Pengganti</label>
              <Dropdown
                id="swap-colleague"
                variant="form"
                value={form.colleague}
                onChange={(event) => updateField('colleague', event.target.value)}
                options={colleagueOptions}
                placeholder="-- Cari Nama Rekan --"
                searchable
                className={invalidField === 'colleague' ? 'dropdown--invalid' : ''}
                ariaLabel="Pilih rekan pengganti"
              />
            </div>

            <div className="pgj-swap-field">
              <label htmlFor="swap-reason">Alasan Tukar Shift</label>
              <textarea
                id="swap-reason"
                rows={3}
                value={form.reason}
                onChange={(event) => updateField('reason', event.target.value)}
                placeholder="Alasan singkat..."
                className={invalidField === 'reason' ? 'is-invalid' : ''}
              />
            </div>

            {invalidField && <p className="pgj-swap-error" role="alert">Lengkapi semua isian terlebih dahulu.</p>}
          </div>
        </DropdownPortalContext.Provider>

        <footer className="pgj-swap-footer">
          <button type="button" className="pgj-swap-cancel" onClick={() => close(onClose)}>Batal</button>
          <button type="submit" className="pgj-swap-submit">Kirim Pengajuan</button>
        </footer>
      </form>
    </div>
  );
}
