// src/pages/Pengajuan/components/ShiftSwapIncomingCard.jsx
//
// [BARU] Daftar permintaan tukar shift yang menunggu persetujuan REKAN PENGGANTI.
// Saat "Setuju" diklik, status pengajuan berubah menjadi "Menunggu ACC Atasan".
// Bila `simulated` aktif, pengajuan milik pengguna sendiri juga ikut tampil di sini agar
// alur Setuju -> Menunggu ACC Atasan bisa dicoba tanpa akun penerima sungguhan.
//
// Contoh pemakaian:
// <ShiftSwapIncomingCard requests={incoming} onRespond={(id, isAccepted) => ...} simulated />
import React from 'react';
import { Check, X } from 'lucide-react';
import './ShiftSwapIncomingCard.css';

export default function ShiftSwapIncomingCard({ requests, onRespond, simulated = false }) {
  if (requests.length === 0) return null;

  return (
    <section className="pgj-incoming" aria-label="Permintaan tukar shift menunggu persetujuan rekan">
      <header className="pgj-incoming__header">
        <h3>Menunggu Persetujuan Rekan Pengganti</h3>
        <span className="pgj-incoming__count">{requests.length}</span>
      </header>

      {simulated && (
        <p className="pgj-incoming__note">
          Mode simulasi: belum ada akun penerima sungguhan, jadi pengajuan Anda sendiri juga tampil di sini
          agar alur persetujuan rekan bisa dicoba.
        </p>
      )}

      <ul className="pgj-incoming__list">
        {requests.map((request) => (
          <li key={request.id} className="pgj-incoming__item">
            <div className="pgj-incoming__info">
              <strong>{request.requesterName} <span aria-hidden="true">&rarr;</span> {request.receiverName}</strong>
              <span title={request.shiftLabel}>{request.shiftLabel}</span>
              <em title={request.reason}>Alasan: {request.reason}</em>
            </div>
            <div className="pgj-incoming__actions">
              <button
                type="button"
                className="pgj-incoming__btn pgj-incoming__btn--reject"
                onClick={() => onRespond(request.id, false)}
              >
                <X aria-hidden="true" /> Tolak
              </button>
              <button
                type="button"
                className="pgj-incoming__btn pgj-incoming__btn--approve"
                onClick={() => onRespond(request.id, true)}
              >
                <Check aria-hidden="true" /> Setuju
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
