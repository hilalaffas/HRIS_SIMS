import React, { useEffect, useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { getHrdApprovers } from '../../../services/CutiService';
import './PermissionRequestModal.css';

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

export default function CorrectionRequestModal({ dateLabel, lateLabel, onSubmit, onClose }) {
  const submitLockRef = useRef(false);
  const [reason, setReason] = useState('');
  const [hrdApprovers, setHrdApprovers] = useState([]);
  const [hrdEmployeeId, setHrdEmployeeId] = useState('');
  const [loadingApprovers, setLoadingApprovers] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    // Semua koreksi terlambat hanya disetujui HRD. Backend sudah mengeluarkan pemohon dari daftar.
    const loadApprovers = async () => {
      try {
        const people = await getHrdApprovers();
        if (active) setHrdApprovers(people || []);
      } catch (error) {
        if (active) setErrorMessage(error?.message || 'Gagal memuat daftar approval.');
      } finally {
        if (active) setLoadingApprovers(false);
      }
    };
    loadApprovers();
    const handleKeyDown = (event) => { if (event.key === 'Escape' && !submitLockRef.current) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { active = false; window.removeEventListener('keydown', handleKeyDown); };
  }, [onClose]);

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < MIN_REASON_LENGTH) return setErrorMessage(`Alasan koreksi minimal ${MIN_REASON_LENGTH} karakter.`);
    if (!hrdEmployeeId) return setErrorMessage('Pilih nama approver HRD terlebih dahulu.');
    submitLockRef.current = true; setIsSubmitting(true); setErrorMessage('');
    try { await onSubmit({ reason: trimmedReason, hrdEmployeeId: Number(hrdEmployeeId) }); }
    catch (error) { setErrorMessage(error?.message || 'Gagal mengirim pengajuan koreksi.'); }
    finally { submitLockRef.current = false; setIsSubmitting(false); }
  };

  return (
    <div className="abs-permission-backdrop" role="presentation">
      <div className="abs-permission-modal" role="dialog" aria-modal="true" aria-labelledby="abs-correction-title">
        <div className="abs-permission-header">
          <h2 id="abs-correction-title"><Pencil aria-hidden="true" /> Ajukan Koreksi Absensi</h2>
          <button type="button" aria-label="Tutup" onClick={onClose} disabled={isSubmitting}><X aria-hidden="true" /></button>
        </div>
        <div className="abs-permission-body">
          <p className="abs-permission-hint">Absensi tanggal {dateLabel} tercatat terlambat{lateLabel ? ` (${lateLabel})` : ''}. Pilih satu rekan HRD sebagai approver. Koreksi hanya dapat disetujui oleh HRD.</p>
          <div className="abs-permission-field">
            <label className="abs-permission-label" htmlFor="abs-correction-reason">Alasan koreksi</label>
            <textarea id="abs-correction-reason" value={reason} maxLength={MAX_REASON_LENGTH} rows={3}
              placeholder="Jelaskan alasan keterlambatan dan koreksi yang diajukan."
              onChange={(event) => setReason(event.target.value)} disabled={isSubmitting} />
            <p className="abs-permission-hint">{reason.length}/{MAX_REASON_LENGTH} karakter</p>
          </div>
          <div className="abs-permission-field">
            <label className="abs-permission-label" htmlFor="correction-hrdEmployeeId">Approver HRD</label>
            <select id="correction-hrdEmployeeId" value={hrdEmployeeId}
              onChange={(event) => { setHrdEmployeeId(event.target.value); setErrorMessage(''); }}
              disabled={isSubmitting || loadingApprovers || hrdApprovers.length === 0}>
              <option value="">{loadingApprovers ? 'Memuat...' : hrdApprovers.length === 0 ? 'Belum ada HRD tersedia' : 'Pilih HRD'}</option>
              {hrdApprovers.map((person) => (
                <option key={person.employeeId} value={person.employeeId}>{person.fullName}</option>
              ))}
            </select>
          </div>
          {errorMessage && <p className="abs-permission-error" role="alert">{errorMessage}</p>}
        </div>
        <div className="abs-permission-footer">
          <button type="button" className="abs-permission-cancel" onClick={onClose} disabled={isSubmitting}>Batal</button>
          <button type="button" className="abs-permission-submit" onClick={handleSubmit} disabled={isSubmitting || loadingApprovers}>
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </div>
    </div>
  );
}
