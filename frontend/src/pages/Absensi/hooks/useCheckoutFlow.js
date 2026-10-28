// src/pages/Absensi/hooks/useCheckoutFlow.js
//
// [BARU] Pintu masuk tunggal tombol Absen Masuk/Keluar. Menggabungkan dua
// penjaga check-out dalam satu alur:
//
//   Keluar sebelum 8 jam kerja  -> popup "Peringatan Pulang Cepat" (useEarlyCheckout)
//   Keluar setelah jam 17:00    -> popup "Check-Out Jam Kerja (17:00+)":
//        [Check-Out]  -> buka kamera & kirim absen Keluar
//        [Tambah Lembur] -> form (jam mulai = lanjutan lembur terakhir)
//                           -> kembali ke popup yang sama (LOOP) sampai Check-Out
//   selain itu                  -> langsung buka kamera
//
// Tombol di halaman TETAP "Absen Keluar" sampai karyawan check-out; menambah
// lembur tidak mengubah status absen. Pulang cepat didahulukan: durasi kerja
// < 8 jam tidak ditanya soal lembur.
//
// Contoh pemakaian:
// const flow = useCheckoutFlow({ openCapture: capture.open, checkInAt, onOvertimeSubmitted });
// <button onClick={() => flow.startAttendance('Keluar')} />
// <CheckoutFlowModals flow={flow} />
import { useCallback, useEffect, useRef, useState } from 'react';
import useEarlyCheckout from './useEarlyCheckout';
import { isEarlyCheckout } from '../utils/earlyCheckout';
import { isAfterWorkEnd } from '../utils/overtimeCheckout';
import {
  getOvertimeExtensionWindow,
  submitOvertimeExtension,
  toDisplayExtensionWindow,
} from '../../../services/overtimeService';

const IDLE_WINDOW = { status: 'idle', data: null, error: '' }; // status: idle | loading | ready | error

export default function useCheckoutFlow({ openCapture, checkInAt, onOvertimeSubmitted, shiftEndTime, requiredWorkHours }) {
  const early = useEarlyCheckout({ openCapture, checkInAt, requiredWorkHours });
  const { startAttendance: startEarlyAware } = early;

  const [step, setStep] = useState(null); // null (tertutup) | 'choice' | 'form'
  const [windowState, setWindowState] = useState(IDLE_WINDOW);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Naik setiap popup ditutup/dimuat ulang -> respons lama yang telat datang diabaikan.
  const requestRef = useRef(0);
  // Gerbang sinkron anti double-submit (state saja terlambat satu render).
  const submitLockRef = useRef(false);
  // Callback terbaru tanpa membuat handler berubah identitas tiap render.
  const onSubmittedRef = useRef(onOvertimeSubmitted);
  useEffect(() => {
    onSubmittedRef.current = onOvertimeSubmitted;
  });
  useEffect(() => () => { requestRef.current += 1; }, []);

  const loadWindow = useCallback(async () => {
    requestRef.current += 1;
    const requestId = requestRef.current;
    setWindowState({ status: 'loading', data: null, error: '' });
    try {
      const raw = await getOvertimeExtensionWindow();
      if (requestId === requestRef.current) {
        setWindowState({ status: 'ready', data: toDisplayExtensionWindow(raw), error: '' });
      }
    } catch (error) {
      if (requestId === requestRef.current) {
        setWindowState({
          status: 'error',
          data: null,
          error: error?.message || 'Gagal memuat data lembur hari ini.',
        });
      }
    }
  }, []);

  const startAttendance = useCallback((action) => {
    if (action === 'Keluar' && !isEarlyCheckout(checkInAt, new Date(), requiredWorkHours) && isAfterWorkEnd(new Date(), shiftEndTime)) {
      setStep('choice');
      loadWindow();
      return;
    }
    startEarlyAware(action); // pulang cepat -> popup peringatan; selain itu -> kamera
  }, [checkInAt, loadWindow, requiredWorkHours, shiftEndTime, startEarlyAware]);

  const close = useCallback(() => {
    requestRef.current += 1;
    setStep(null);
  }, []);

  // "Tidak Lembur" / "Check-Out Sekarang": tutup popup lalu buka kamera absen Keluar.
  const checkoutNow = useCallback(() => {
    close();
    openCapture('Keluar');
  }, [close, openCapture]);

  // "Tambah Lembur": hanya jika server bilang masih ada waktu yang bisa diajukan.
  const openForm = useCallback(() => {
    if (windowState.status === 'ready' && windowState.data?.canExtend) setStep('form');
  }, [windowState]);

  const backToChoice = useCallback(() => setStep('choice'), []);

  // Dipanggil form. Error SENGAJA dilempar ulang supaya form tetap terbuka
  // dengan pesan backend; sukses -> kembali ke popup pilihan (loop) dengan data segar.
  const submitExtension = useCallback(async ({ endTime, reason }) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const saved = await submitOvertimeExtension({ endTime, reason });
      onSubmittedRef.current?.(saved);
      setStep('choice');
      loadWindow();
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [loadWindow]);

  return {
    startAttendance,
    // props untuk EarlyCheckoutModal
    early: {
      isPromptOpen: early.isPromptOpen,
      onConfirm: early.confirmEarlyCheckout,
      onCancel: early.cancelEarlyCheckout,
    },
    // props untuk CheckoutOvertimeModal; null = popup tertutup
    overtime: step
      ? {
        step,
        windowState,
        submitting: isSubmitting,
        onCheckout: checkoutNow,
        onAddOvertime: openForm,
        onRetry: loadWindow,
        onBack: backToChoice,
        onClose: close,
        onSubmit: submitExtension,
      }
      : null,
  };
}
