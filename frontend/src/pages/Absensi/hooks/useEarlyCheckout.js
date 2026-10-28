// src/pages/Absensi/hooks/useEarlyCheckout.js
//
// [BARU] Pintu masuk tunggal untuk tombol Absen Masuk/Keluar. Kalau karyawan
// menekan Keluar sebelum 8 jam kerja, popup "Peringatan Pulang Cepat" muncul
// dulu (alasan wajib); baru setelah dikonfirmasi popup kamera/lokasi dibuka
// dengan alasan itu terisi di kolom Keterangan. Dipakai Dashboard & Absensi Saya.
//
// Contoh pemakaian:
// const early = useEarlyCheckout({ openCapture: capture.open, checkInAt });
// <button onClick={() => early.startAttendance('Keluar')} />
// {early.isPromptOpen && <EarlyCheckoutModal onConfirm={early.confirmEarlyCheckout} onCancel={early.cancelEarlyCheckout} />}
import { useCallback, useState } from 'react';
import { buildEarlyCheckoutNote, isEarlyCheckout } from '../utils/earlyCheckout';

export default function useEarlyCheckout({ openCapture, checkInAt, requiredWorkHours }) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const startAttendance = useCallback((action) => {
    if (action === 'Keluar' && isEarlyCheckout(checkInAt, new Date(), requiredWorkHours)) {
      setIsPromptOpen(true);
      return;
    }
    openCapture(action);
  }, [checkInAt, openCapture, requiredWorkHours]);

  const confirmEarlyCheckout = useCallback((reason) => {
    setIsPromptOpen(false);
    openCapture('Keluar', 'Absen', buildEarlyCheckoutNote(reason));
  }, [openCapture]);

  const cancelEarlyCheckout = useCallback(() => setIsPromptOpen(false), []);

  return { isPromptOpen, startAttendance, confirmEarlyCheckout, cancelEarlyCheckout };
}
