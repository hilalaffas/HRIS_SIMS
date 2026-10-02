// src/pages/Lembur/components/OvertimeFormModal.jsx
//
// Form "Buat Pengajuan Lembur Baru". Validasi dasar di sini hanya untuk UX;
// aturan sebenarnya ditegakkan backend (OvertimeService.submit()).
import React, { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { formatOvertimeDuration } from '../../../services/overtimeService';
import './OvertimeFormModal.css';

const pad = (value) => String(value).padStart(2, '0');

const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// "17:00" -> 1020 (menit sejak tengah malam)
const toMinutes = (time) => {
  if (!time) return null;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const MAX_REASON_LENGTH = 500;

export default function OvertimeFormModal({ onClose, onSubmit }) {
  const todayKey = useMemo(() => getTodayKey(), []);
  const [form, setForm] = useState({ overtimeDate: todayKey, startTime: '', endTime: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  // Gerbang sinkron anti double-submit (state saja terlambat satu render).
  const submitLock = useRef(false);

  const startMinutes = toMinutes(form.startTime);
  const endMinutes = toMinutes(form.endTime);
  const totalMinutes = startMinutes != null && endMinutes != null ? endMinutes - startMinutes : null;
  const hasValidRange = totalMinutes != null && totalMinutes > 0;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrorMessage('');
  };

  const validate = () => {
    if (!form.overtimeDate) return 'Tanggal lembur wajib diisi.';
    if (form.overtimeDate > todayKey) return 'Tanggal lembur tidak boleh melebihi hari ini.';
    if (!form.startTime || !form.endTime) return 'Jam mulai dan jam selesai wajib diisi.';
    if (!hasValidRange) return 'Jam selesai harus lebih besar dari jam mulai.';
    if (!form.reason.trim()) return 'Alasan / pekerjaan lembur wajib diisi.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitLock.current) return;

    const validationMessage = validate();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      await onSubmit({ ...form, reason: form.reason.trim() });
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengirim pengajuan lembur.');
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="lmb-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="lmb-modal-title">
      <form className="lmb-modal" onSubmit={handleSubmit} noValidate>
        <div className="lmb-modal-header">
          <h2 id="lmb-modal-title">Buat Pengajuan Lembur Baru</h2>
          <button type="button" className="lmb-modal-close" onClick={onClose} disabled={submitting} aria-label="Tutup">
            <X aria-hidden="true" />
          </button>
        </div>

        <label className="lmb-field">
          <span>Tanggal Lembur</span>
          <input type="date" name="overtimeDate" value={form.overtimeDate} max={todayKey} onChange={updateField} />
        </label>

        <div className="lmb-field-row">
          <label className="lmb-field">
            <span>Jam Mulai</span>
            <input type="time" name="startTime" value={form.startTime} onChange={updateField} />
          </label>
          <label className="lmb-field">
            <span>Jam Selesai</span>
            <input type="time" name="endTime" value={form.endTime} onChange={updateField} />
          </label>
        </div>

        <p className="lmb-total-hint">
          Total jam lembur: <strong>{hasValidRange ? formatOvertimeDuration(totalMinutes) : '-'}</strong>
        </p>

        <label className="lmb-field">
          <span>Alasan / Pekerjaan Lembur</span>
          <textarea
            name="reason"
            rows={3}
            maxLength={MAX_REASON_LENGTH}
            placeholder="Contoh: Maintenance server & backup database"
            value={form.reason}
            onChange={updateField}
          />
        </label>

        {errorMessage && <p className="lmb-form-error" role="alert">{errorMessage}</p>}

        <div className="lmb-modal-actions">
          <button type="button" className="lmb-outline-button" onClick={onClose} disabled={submitting}>
            Batal
          </button>
          <button type="submit" className="lmb-primary-button" disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>
    </div>
  );
}
