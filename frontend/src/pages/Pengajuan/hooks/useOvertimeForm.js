// src/pages/Pengajuan/hooks/useOvertimeForm.js
//
// State + validasi formulir inline "Lembur" (tab Pengajuan). Aturannya sama
// dengan OvertimeFormModal: hari kerja maksimal hari ini; lembur hari libur
// diajukan pada hari kerja terakhir sebelumnya. Satu pengajuan untuk satu tanggal.
// Validasi di sini hanya untuk UX -- aturan sebenarnya ditegakkan backend
// (OvertimeService.submit()). `onSubmit` milik parent HARUS melempar error bila
// gagal supaya pesannya tampil.
//
// Contoh pemakaian:
// const form = useOvertimeForm(async (values) => { await submitOvertime(values); }, ['LEADER', 'SPV', 'MANAGER']);
// requiredStages = tahap approval sesuai jabatan pemohon (constants/overtimeFlow.js: getRequiredStages).
import useHolidayOvertimeWindow from '../../../hooks/useHolidayOvertimeWindow';
import { validateOvertimeDate, overtimeRangeMinutes, overtimeTodayKey } from '../../../utils/holidayOvertime';
import { useRef, useState } from 'react';
import { buildApproverPayload, formatOvertimeDuration } from '../../../services/overtimeService';
import { STAGE_FIELD, STAGE_META } from '../../../constants/overtimeFlow';
import { validateRequired } from '../../../utils/validation';

export const OVERTIME_REASON_MAX_LENGTH = 500;

// Dihitung tiap render (bukan disimpan) supaya tetap benar bila halaman dibiarkan lewat tengah malam.
export const getTodayKey = overtimeTodayKey;

const createInitialForm = () => ({ overtimeDate: getTodayKey(), startTime: '', endTime: '', reason: '',
  leaderEmployeeId: '', spvEmployeeId: '', managerEmployeeId: '', hrdEmployeeId: '',
});

export default function useOvertimeForm(onSubmit, requiredStages = ['HRD']) {
  const calendar = useHolidayOvertimeWindow();
  const { holidayWindow } = calendar;
  const submitLockRef = useRef(false); // gerbang sinkron anti double-submit
  const [form, setForm] = useState(createInitialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalMinutes = overtimeRangeMinutes(form.startTime, form.endTime);
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
      // [UBAH] Satu approver wajib untuk SETIAP tahap sesuai jabatan pemohon.
      ...requiredStages.map((stage) => ({
        field: STAGE_FIELD[stage],
        label: `Approver ${STAGE_META[stage].label}`,
        value: form[STAGE_FIELD[stage]],
      })),
    ]);
    if (!errors.overtimeDate) {
      const dateError = validateOvertimeDate(form.overtimeDate, holidayWindow);
      if (dateError) errors.overtimeDate = dateError;
    }
    if (!errors.startTime && !errors.endTime && !hasValidRange) {
      errors.endTime = 'Jam selesai harus setelah jam mulai pada tanggal yang sama.';
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
      await onSubmit({
        ...form,
        reason: form.reason.trim(),
        ...buildApproverPayload(requiredStages, form),
      });
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
    calendarError: calendar.error,
    maxDate: holidayWindow?.maxDate || getTodayKey(),
    holidayWindow,
    totalLabel,
    hasValidRange,
    todayKey: getTodayKey(),
    updateField,
    handleSubmit,
  };
}
