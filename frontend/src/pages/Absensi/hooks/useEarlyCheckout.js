// src/pages/Absensi/hooks/useEarlyCheckout.js
//
// [BARU] Pintu masuk tunggal untuk tombol Absen Masuk/Keluar. Kalau karyawan
// menekan Keluar sebelum jam pulang terjadwal, popup "Peringatan Pulang Cepat" muncul
// dulu (alasan wajib); baru setelah dikonfirmasi popup kamera/lokasi dibuka
// dengan alasan itu terisi di kolom Keterangan. Dipakai Dashboard & Absensi Saya.
//
// Contoh pemakaian:
// const early = useEarlyCheckout({ openCapture: capture.open, workEndAt });
// <button onClick={() => early.startAttendance('Keluar')} />
// {early.isPromptOpen && <EarlyCheckoutModal onConfirm={early.confirmEarlyCheckout} onCancel={early.cancelEarlyCheckout} />}
import { useCallback, useState } from 'react';
import { buildEarlyCheckoutNote } from '../utils/earlyCheckout';
import { isBeforeWorkEnd } from '../utils/workEndCheckout';

// [UBAH] Pulang cepat = keluar SEBELUM jam pulang terjadwal (workEndAt), bukan berdasarkan lama hadir.
export default function useEarlyCheckout({ openCapture, workEndAt }) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const startAttendance = useCallback((action) => {
    if (action === 'Keluar' && isBeforeWorkEnd(workEndAt)) {
      setIsPromptOpen(true);
      return;
    }
    openCapture(action);
  }, [openCapture, workEndAt]);

  const confirmEarlyCheckout = useCallback((reason) => {
    setIsPromptOpen(false);
    openCapture('Keluar', 'Absen', buildEarlyCheckoutNote(reason));
  }, [openCapture]);

  const cancelEarlyCheckout = useCallback(() => setIsPromptOpen(false), []);

  return { isPromptOpen, startAttendance, confirmEarlyCheckout, cancelEarlyCheckout };
}
