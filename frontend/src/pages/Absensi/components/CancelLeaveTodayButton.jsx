import React, { useRef, useState } from 'react';
import { CalendarX } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '../../../services/api';
import LeaveConfirmModal from '../../Cuti/applycuti/components/LeaveConfirmModal';

export default function CancelLeaveTodayButton({ leave, className = '', onCancelled }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!leave?.canCancel || !leave.leaveRequestId) return null;
  const cancel = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await api.post(`/api/cuti/${leave.leaveRequestId}/cancel-today`, {});
      setConfirmOpen(false);
      window.dispatchEvent(new Event('sims:leave-changed'));
      await onCancelled?.();
    } catch (e) { setConfirmOpen(false); setError(e?.message || 'Gagal membatalkan cuti.'); }
    finally { lock.current=false; setBusy(false); }
  };
  // [UBAH] class cancel-leave-today-control + label dibungkus span (responsif)
  return <span className="cancel-leave-today-control">
    <button type="button" className={className} disabled={busy} onClick={() => { setError(''); setConfirmOpen(true); }}>
      <CalendarX size={15} aria-hidden="true" /><span className="abs-portal-button__label">{busy ? 'Membatalkan...' : 'Batal Cuti Hari Ini'}</span>
    </button>
    {error && <small role="alert" style={{display:'block',color:'var(--color-danger)',maxWidth:280}}>{error}</small>}
    {confirmOpen && createPortal(
      <LeaveConfirmModal
        isOpen
        summary={{}}
        title="Konfirmasi Pembatalan Cuti"
        subtitle="Periksa detail cuti yang akan dibatalkan untuk hari ini."
        notice="Kuota cuti yang terpakai hari ini akan dikembalikan. Hari cuti lainnya tetap berlaku."
        customSections={[{
          title: 'Detail Pembatalan',
          rows: [
            { label: 'Jenis Cuti', value: leave.leaveTypeName || 'Cuti' },
            { label: 'Tanggal', value: new Date(`${leave.workDate}T00:00:00`).toLocaleDateString('id-ID', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            }) },
            { label: 'Pembatalan', value: 'Hanya cuti hari ini', strong: true },
          ],
        }]}
        cancelLabel="Kembali"
        confirmLabel="Ya, Batalkan Cuti"
        submittingLabel="Membatalkan..."
        isSubmitting={busy}
        onCancel={() => { if (!lock.current) setConfirmOpen(false); }}
        onConfirm={cancel}
      />, document.body,
    )}
  </span>;
}
