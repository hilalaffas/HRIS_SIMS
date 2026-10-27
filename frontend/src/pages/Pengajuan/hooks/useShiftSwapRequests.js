// src/pages/Pengajuan/hooks/useShiftSwapRequests.js
//
// [BARU] State pengajuan Tukar Shift -- SEMENTARA, hanya di sisi frontend (belum ada
// backend). Data hilang saat halaman dimuat ulang. Alur status:
//   PENDING_COLLEAGUE --(rekan klik Setuju)--> PENDING_SUPERIOR ("Menunggu ACC Atasan")
//   PENDING_COLLEAGUE --(rekan klik Tolak)---> REJECTED_COLLEAGUE
// ACC atasan belum disimulasikan: status berhenti di "Menunggu ACC Atasan".
// TODO: ganti isi hook ini dengan pemanggilan service begitu endpoint tukar shift ada.
//
// Contoh pemakaian:
// const shiftSwap = useShiftSwapRequests();
// shiftSwap.createRequest({ shiftLabel, receiverName, reason });
// shiftSwap.respondAsColleague(requestId, true);
import { useCallback, useRef, useState } from 'react';

export const SHIFT_SWAP_SELF_LABEL = 'Anda';

// Contoh permintaan MASUK dari rekan (Anda = penerima), agar tombol Setuju/Tolak bisa dicoba.
const SEED_REQUESTS = [
  {
    id: 'demo-1',
    direction: 'IN',
    requesterName: 'Rekan Contoh 2',
    receiverName: SHIFT_SWAP_SELF_LABEL,
    shiftLabel: 'Kamis, 29 Okt 2026 \u2014 Shift Pagi (07:00\u201315:00)',
    reason: 'Ada keperluan keluarga yang tidak bisa ditinggalkan.',
    createdAt: '2026-10-27T08:30:00',
    status: 'PENDING_COLLEAGUE',
  },
];

const pad = (value) => String(value).padStart(2, '0');
const toLocalIso = (date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
);

export default function useShiftSwapRequests() {
  const [requests, setRequests] = useState(SEED_REQUESTS);
  const nextIdRef = useRef(1);

  const createRequest = useCallback(({ shiftLabel, receiverName, reason }) => {
    const id = `local-${nextIdRef.current}`;
    nextIdRef.current += 1;
    setRequests((current) => [
      {
        id,
        direction: 'OUT',
        requesterName: SHIFT_SWAP_SELF_LABEL,
        receiverName,
        shiftLabel,
        reason,
        createdAt: toLocalIso(new Date()),
        status: 'PENDING_COLLEAGUE',
      },
      ...current,
    ]);
  }, []);

  // Hanya permintaan yang masih menunggu rekan yang bisa direspons (cegah klik ganda).
  const respondAsColleague = useCallback((requestId, isAccepted) => {
    setRequests((current) => current.map((request) => (
      request.id === requestId && request.status === 'PENDING_COLLEAGUE'
        ? { ...request, status: isAccepted ? 'PENDING_SUPERIOR' : 'REJECTED_COLLEAGUE' }
        : request
    )));
  }, []);

  return { requests, createRequest, respondAsColleague };
}
