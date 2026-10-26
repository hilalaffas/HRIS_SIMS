// src/pages/Pengajuan/hooks/useLeaveDetails.js
//
// Daftar cuti (/api/cuti/me) TIDAK memuat log approval, padahal kartu alur
// & kolom Status perlu tahu "menunggu siapa" / "ditolak oleh siapa". Hook ini
// mengambil detail (/api/cuti/{id}/detail) untuk cuti yang belum final-ACC
// (maks. 10 terbaru) plus cuti yang sedang dipilih, lalu menyimpannya per id.
// Cuti yang masih diproses diambil ulang setiap riwayat tersinkron (15 detik).
//
// Contoh pemakaian:
// const leaveDetails = useLeaveDetails(leave.history, selectedLeaveId, leave.historySyncedAt);
import { useEffect, useState } from 'react';
import { getMyLeaveDetail } from '../../../services/CutiService';

const MAX_PREFETCH = 10;
const FINAL_APPROVED = 'Disetujui (ACC)';

export default function useLeaveDetails(leaveHistory, selectedLeaveId, syncedAt) {
  const [details, setDetails] = useState({});

  useEffect(() => {
    const newest = [...leaveHistory]
      .filter((record) => record.status !== FINAL_APPROVED)
      .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')))
      .slice(0, MAX_PREFETCH)
      .map((record) => record.id);
    const targetIds = selectedLeaveId != null && !newest.includes(selectedLeaveId)
      ? [...newest, selectedLeaveId]
      : newest;
    if (targetIds.length === 0) return undefined;

    let cancelled = false;
    Promise.allSettled(targetIds.map((id) => getMyLeaveDetail(id, { silent: true }))).then((results) => {
      if (cancelled) return;
      setDetails((current) => {
        const next = { ...current };
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') next[targetIds[index]] = result.value;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [leaveHistory, selectedLeaveId, syncedAt]);

  return details;
}
