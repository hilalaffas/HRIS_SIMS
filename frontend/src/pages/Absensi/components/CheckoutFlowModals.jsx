// src/pages/Absensi/components/CheckoutFlowModals.jsx
//
// [BARU] Merender popup milik useCheckoutFlow: "Peringatan Pulang Cepat" dan
// "Check-Out Jam Kerja (17:00+)". Cukup satu baris di halaman pemakai (Absensi
// Saya & Dashboard); keduanya memakai portal ke <body>, jadi aman diletakkan
// di luar kartu yang memakai container-type.
//
// Contoh pemakaian:
// <CheckoutFlowModals flow={checkoutFlow} />
import React from 'react';
import EarlyCheckoutModal from './EarlyCheckoutModal';
import CheckoutOvertimeModal from './CheckoutOvertimeModal';

export default function CheckoutFlowModals({ flow }) {
  return (
    <>
      {flow.early.isPromptOpen && (
        <EarlyCheckoutModal onConfirm={flow.early.onConfirm} onCancel={flow.early.onCancel} />
      )}
      {flow.overtime && <CheckoutOvertimeModal {...flow.overtime} />}
    </>
  );
}
