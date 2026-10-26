// src/pages/Pengajuan/hooks/useOvertimeForm.js
//
// State + validasi formulir inline "Lembur" (tab Pengajuan). Aturannya sama
// dengan OvertimeFormModal di halaman Lembur: tanggal tidak boleh melewati hari
// ini, jam selesai harus lebih besar dari jam mulai, alasan wajib (maks 500).
// Validasi di sini hanya untuk UX -- aturan sebenarnya ditegakkan backend
// (OvertimeService.submit()). `onSubmit` milik parent HARUS melempar error bila
// gagal supaya pesannya tampil.
//
// Contoh pemakaian:
// const form = useOvertimeForm(async (values) => { await submitOvertime(values); });
import { useRef, useState } from 'react';
import { formatOvertimeDuration } from '../../../services/overtimeService';
import { validateRequired } from '../../../utils/validation';

export const OVERTIME_REASON_MAX_LENGTH = 500;

const pad = (value) => String(value).padStart(2, '0');

// Dihitung tiap render (bukan disimpan) supaya tetap benar bila halaman dibiarkan lewat tengah malam.
export const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// "17:00" -> 1020 (menit sejak tengah malam)
const toMinutes = (time) => {
  if (!time) return null;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const createInitialForm = () => ({ overtimeDate: getTodayKey(), startTime: '', endTime: '', reason: '' });

export default function useOvertimeForm(onSubmit) {
  const submitLockRef = useRef(false); // gerbang sinkron anti double-submit
  const [form, setForm] = useState(createInitialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startMinutes = toMinutes(form.startTime);
  const endMinutes = toMinutes(form.endTime);
  const totalMinutes = startMinutes != null && endMinutes != null ? endMinutes - startMinutes : null;
  const hasValidRange = totalMinutes != null && totalMinutes > 0;
  const totalLabel = hasValidRange ? formatOvertimeDuration(totalMinutes) : '-';

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
    setErrorMessage('');
  };

  const validate = () => {
    const { errors } = validateRequired([
      { field: 'overtimeDate', label: 'Tanggal lembur', value: form.overtimeDate },
      { field: 'startTime', label: 'Jam mulai', value: form.startTime },
      { field: 'endTime', label: 'Jam selesai', value: form.endTime },
      { field: 'reason', label: 'Alasan / pekerjaan lembur', value: form.reason },
    ]);
    if (!errors.overtimeDate && form.overtimeDate > getTodayKey()) {
      errors.overtimeDate = 'Tanggal lembur tidak boleh melebihi hari ini.';
    }
    if (!errors.startTime && !errors.endTime && !hasValidRange) {
      errors.endTime = 'Jam selesai harus lebih besar dari jam mulai.';
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (submitLockRef.current) return;

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSubmit({ ...form, reason: form.reason.trim() });
      setForm(createInitialForm());
      setFieldErrors({});
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengirim pengajuan lembur.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    form,
    fieldErrors,
    errorMessage,
    isSubmitting,
    totalLabel,
    hasValidRange,
    todayKey: getTodayKey(),
    updateField,
    handleSubmit,
  };
}
