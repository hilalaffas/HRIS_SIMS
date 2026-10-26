// src/pages/Pengajuan/hooks/usePermissionForm.js
//
// State + validasi formulir inline "Sakit & Izin" (tab Pengajuan). Aturannya
// sama dengan PermissionRequestModal di halaman Absensi:
//  - Izin Sakit     : keterangan + lama izin (hari kerja, maks 30) + surat dokter
//                     (boleh menyusul; selama menyusul lama izin dikunci 1 hari).
//  - Izin Terlambat : cukup keterangan.
// Validasi di sini hanya untuk UX -- aturan sebenarnya ditegakkan backend.
// `onSubmit` milik parent HARUS melempar error bila gagal supaya pesannya tampil.
//
// Contoh pemakaian:
// const form = usePermissionForm(async (payload) => { await submit(payload); });
import { useRef, useState } from 'react';
import { validateRequired } from '../../../utils/validation';

export const PERMISSION_NOTE_MAX_LENGTH = 255; // attendances.note VARCHAR(255)
export const MAX_SICK_DAYS = 30; // sama dengan AttendanceService.MAX_SICK_DAYS

const TYPE_SICK = 'SAKIT';

export default function usePermissionForm(onSubmit) {
  const submitLockRef = useRef(false); // gerbang sinkron anti double-submit
  const [type, setType] = useState(TYPE_SICK);
  const [days, setDays] = useState('1');
  const [note, setNote] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [documentLater, setDocumentLater] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSick = type === TYPE_SICK;

  const clearFieldError = (field) => {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
    setErrorMessage('');
  };

  const changeType = (nextType) => {
    setType(nextType);
    setFieldErrors({});
    setErrorMessage('');
  };

  const changeNote = (value) => {
    setNote(value);
    clearFieldError('note');
  };

  const changeDays = (value) => {
    setDays(value);
    clearFieldError('days');
  };

  const changeDocumentFile = (file) => {
    setDocumentFile(file);
    clearFieldError('documentFile');
  };

  const changeDocumentLater = (checked) => {
    setDocumentLater(checked);
    if (checked) {
      setDocumentFile(null);
      setDays('1'); // surat menyusul -> lama izin dikunci 1 hari
    }
    setFieldErrors({});
    setErrorMessage('');
  };

  const validate = () => {
    const { errors } = validateRequired([{ field: 'note', label: 'Keterangan', value: note }]);
    if (isSick) {
      const dayCount = Number(days);
      if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > MAX_SICK_DAYS) {
        errors.days = `Lama izin sakit harus 1 sampai ${MAX_SICK_DAYS} hari.`;
      }
      if (!documentFile && !documentLater) {
        errors.documentFile = 'Surat dokter perlu diunggah, atau centang "Surat dokter menyusul".';
      }
    }
    return errors;
  };

  const resetForm = () => {
    setDays('1');
    setNote('');
    setDocumentFile(null);
    setDocumentLater(false);
    setFieldErrors({});
    setErrorMessage('');
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
      await onSubmit({
        type,
        note: note.trim(),
        days: documentLater ? 1 : Number(days),
        documentFile: isSick ? documentFile : null,
      });
      resetForm();
    } catch (error) {
      // Isian dipertahankan supaya pengguna bisa memperbaiki & kirim ulang.
      setErrorMessage(error?.message || 'Gagal mengirim pengajuan. Silakan coba lagi.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    type,
    days,
    note,
    documentFile,
    documentLater,
    isSick,
    fieldErrors,
    errorMessage,
    isSubmitting,
    setErrorMessage, // dipakai dropzone untuk melaporkan tipe/ukuran file yang salah
    changeType,
    changeNote,
    changeDays,
    changeDocumentFile,
    changeDocumentLater,
    handleSubmit,
  };
}
