// src/pages/Absensi/components/CheckoutOvertimeModal.jsx
//
// [BARU] Cangkang popup "Check-Out Jam Kerja (17:00+)": satu backdrop + satu
// kartu yang berganti isi antara dua langkah dengan animasi geser --
//   'choice' : pilih Check-Out atau Tambah Lembur  (CheckoutChoicePanel)
//   'form'   : isi jam selesai & pekerjaan lembur  (OvertimeExtensionPanel)
// Karena kartunya TETAP (tidak di-unmount antar langkah), loop
// pilihan -> form -> pilihan terasa mulus dan tidak ada kedipan backdrop.
// Logika & data ada di hooks/useCheckoutFlow.js; file ini hanya tampilan.
// Dirender lewat portal ke <body> (sama seperti EarlyCheckoutModal).
//
// Contoh pemakaian (lewat CheckoutFlowModals):
// <CheckoutOvertimeModal step="choice" windowState={...} onCheckout={...} ... />
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckoutChoicePanel, OvertimeExtensionPanel } from './CheckoutOvertimePanels';
import './CheckoutOvertimeModal.css';

export default function CheckoutOvertimeModal({
  step,
  windowState,
  submitting,
  onCheckout,
  onAddOvertime,
  onRetry,
  onBack,
  onClose,
  onSubmit,
}) {
  // Arah animasi ditentukan SAAT render (derived state), bukan lewat efek, supaya
  // panel baru langsung memakai kelas animasi yang benar tanpa satu frame "polos".
  const [motion, setMotion] = useState({ step, direction: null });
  if (motion.step !== step) {
    setMotion({ step, direction: step === 'form' ? 'forward' : 'back' });
  }

  // Escape: dari form kembali ke pilihan, dari pilihan menutup. Dikunci saat mengirim.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || submitting) return;
      if (step === 'form') onBack();
      else onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, submitting, onBack, onClose]);

  // Kunci scroll halaman selama popup terbuka.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Klik di luar kartu hanya menutup dari langkah pilihan (form tidak boleh
  // hilang tak sengaja karena isiannya belum disimpan).
  const handleBackdropClick = () => {
    if (step === 'choice' && !submitting) onClose();
  };

  return createPortal(
    <div className="coOt__backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="coOt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coOtTitle"
        aria-busy={submitting}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          key={step}
          className={`coOt__panel${motion.direction ? ` coOt__panel--${motion.direction}` : ''}`}
        >
          {step === 'form' && windowState.data ? (
            <OvertimeExtensionPanel
              data={windowState.data}
              submitting={submitting}
              onBack={onBack}
              onSubmit={onSubmit}
            />
          ) : (
            <CheckoutChoicePanel
              windowState={windowState}
              onCheckout={onCheckout}
              onAddOvertime={onAddOvertime}
              onRetry={onRetry}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
