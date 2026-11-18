import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import RequestDetail from './RequestDetail';
import '../../Pengajuan/components/RequestDetailModal.css';
import './PermissionProcessModal.css';

export default function PermissionProcessModal({ row, processing, onDecision, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus?.(); };
  }, []);
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape' && !processing) onClose();
      if (event.key !== 'Tab') return;
      const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')];
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [processing, onClose]);
  const decide = async (item, status, note) => {
    if (processing) return;
    if (await onDecision(item, status, note)) onClose();
  };
  return createPortal(<div className="pgj-detail-overlay" onClick={(event) => { if (event.target === event.currentTarget && !processing) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="permission-process-title" className="pgj-detail-modal permission-process-modal">
      <header className="pgj-detail-header">
        <div><h2 id="permission-process-title">Proses Pengajuan Sakit &amp; Izin</h2><p>Periksa pengajuan, surat dokter, dan riwayat sebelum mengambil keputusan.</p></div>
        <button type="button" onClick={onClose} disabled={processing} aria-label="Tutup detail"><X aria-hidden="true" /></button>
      </header>
      <div className="permission-process-body">
        <RequestDetail key={`${row.id}-${row.status}-${row.document.code}-${row.attachment?.url || ''}`} row={row} processing={processing}
          onApprove={(item, note) => decide(item, 'APPROVED', note)} onReject={(item, note) => decide(item, 'REJECTED', note)} />
      </div>
    </section>
  </div>, document.body);
}
