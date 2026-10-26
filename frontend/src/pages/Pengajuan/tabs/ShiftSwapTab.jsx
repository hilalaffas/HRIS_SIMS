// src/pages/Pengajuan/tabs/ShiftSwapTab.jsx
//
// Tab "Tukar Shift" (hanya untuk divisi SHIFTING): formulir inline -- pilih
// jadwal sendiri, pilih rekan pengganti, isi alasan. TAMPILAN SEMENTARA:
// endpoint tukar shift belum ada, jadi pengiriman diserahkan ke parent lewat
// `onSubmit(values)` dan riwayatnya masih kosong.
//
// Contoh pemakaian:
// <ShiftSwapTab shiftOptions={[...]} colleagueOptions={[...]} onSubmit={fn} />
import React, { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import PengajuanFormCard, { FieldError } from '../components/PengajuanFormCard';
import { dropdownErrorClass, inputErrorClass, validateRequired } from '../../../utils/validation';

const EMPTY_FORM = { myShift: '', colleague: '', reason: '' };
const REASON_MAX_LENGTH = 255;

export default function ShiftSwapTab({ shiftOptions, colleagueOptions, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { errors, isValid } = validateRequired([
      { field: 'myShift', label: 'Jadwal Anda', value: form.myShift, verb: 'dipilih' },
      { field: 'colleague', label: 'Rekan pengganti', value: form.colleague, verb: 'dipilih' },
      { field: 'reason', label: 'Alasan tukar shift', value: form.reason },
    ]);
    if (!isValid) {
      setFieldErrors(errors);
      return;
    }
    onSubmit({ ...form, reason: form.reason.trim() });
    setForm(EMPTY_FORM);
    setFieldErrors({});
  };

  return (
    <>
      <PengajuanFormCard
        icon={ArrowLeftRight}
        title="Formulir Pengajuan Tukar Shift"
        subtitle="Tukar jadwal shift Anda dengan rekan satu divisi."
        onSubmit={handleSubmit}
      >
        <div className="duration-info-alert duration-info-alert--warning">
          Tampilan Tukar Shift masih sementara: pengajuan belum tersambung ke server.
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pgj-swap-my-shift">JADWAL ANDA (AKAN DITUKAR) *</label>
          <Dropdown
            id="pgj-swap-my-shift"
            value={form.myShift}
            onChange={(event) => updateField('myShift', event.target.value)}
            options={shiftOptions}
            placeholder="-- Pilih Jadwal Anda --"
            className={dropdownErrorClass(fieldErrors.myShift)}
            ariaLabel="Pilih jadwal Anda yang akan ditukar"
          />
          <FieldError message={fieldErrors.myShift} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pgj-swap-colleague">REKAN PENGGANTI *</label>
          <Dropdown
            id="pgj-swap-colleague"
            value={form.colleague}
            onChange={(event) => updateField('colleague', event.target.value)}
            options={colleagueOptions}
            placeholder="-- Cari Nama Rekan --"
            searchable
            className={dropdownErrorClass(fieldErrors.colleague)}
            ariaLabel="Pilih rekan pengganti"
          />
          <FieldError message={fieldErrors.colleague} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="pgj-swap-reason">ALASAN TUKAR SHIFT *</label>
          <textarea
            id="pgj-swap-reason"
            rows={3}
            maxLength={REASON_MAX_LENGTH}
            value={form.reason}
            onChange={(event) => updateField('reason', event.target.value)}
            placeholder="Alasan singkat..."
            className={inputErrorClass(fieldErrors.reason, 'form-control textarea-control')}
          />
          <FieldError message={fieldErrors.reason} />
        </div>
      </PengajuanFormCard>

      <section className="pgj-empty-card">
        <h3>Riwayat Tukar Shift Saya</h3>
        <p>Belum ada pengajuan tukar shift.</p>
      </section>
    </>
  );
}
