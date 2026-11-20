import React, { useEffect, useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { getCorrectionApproverOptions } from '../../../services/attendanceCorrectionService';
import './PermissionRequestModal.css';
import { NO_APPROVER_VALUE, OPTIONAL_STAGES } from '../../../constants/overtimeFlow'; // [BARU] pilihan "-" untuk Leader/SPV

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;
const ROLE_LABELS = { LEADER: 'Leader', SPV: 'SPV', MANAGER: 'Manager', HRD: 'HRD' };

export default function CorrectionRequestModal({ dateLabel, lateLabel, onSubmit, onClose }) {
  const submitLockRef = useRef(false);
  const [reason, setReason] = useState('');
  const [stages, setStages] = useState([]);
  const [selected, setSelected] = useState({});
  const [loadingApprovers, setLoadingApprovers] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getCorrectionApproverOptions().then((data) => { if (active) setStages(data.stages || []); })
      .catch((error) => { if (active) setErrorMessage(error?.message || 'Gagal memuat daftar approver.'); })
      .finally(() => { if (active) setLoadingApprovers(false); });
    const handleKeyDown = (event) => { if (event.key === 'Escape' && !submitLockRef.current) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { active = false; window.removeEventListener('keydown', handleKeyDown); };
  }, [onClose]);

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < MIN_REASON_LENGTH) return setErrorMessage(`Alasan koreksi minimal ${MIN_REASON_LENGTH} karakter.`);
    if (!stages.length) return setErrorMessage('Daftar approver belum tersedia. Buka kembali form ini.');
    for (const stage of stages) {
      if (!selected[stage.field]) return setErrorMessage(`Pilih approver ${ROLE_LABELS[stage.role] || stage.role} terlebih dahulu.`);
    }
    // [UBAH] Pilihan "-" (Leader/SPV) dikirim null = tahap dilewati.
    const approvers = Object.fromEntries(stages.map((stage) => [stage.field,
      selected[stage.field] === NO_APPROVER_VALUE ? null : Number(selected[stage.field])]));
    submitLockRef.current = true; setIsSubmitting(true); setErrorMessage('');
    try { await onSubmit({ reason: trimmedReason, ...approvers }); }
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
          <p className="abs-permission-hint">Absensi tanggal {dateLabel} tercatat terlambat{lateLabel ? ` (${lateLabel})` : ''}.
            {stages.length > 0 && <> Alur persetujuan: {stages.map((stage) => ROLE_LABELS[stage.role] || stage.role).join(' → ')}. Koreksi berlaku setelah seluruh tahap disetujui.</>}
          </p>
          <div className="abs-permission-field">
            <label className="abs-permission-label" htmlFor="abs-correction-reason">Alasan koreksi</label>
            <textarea id="abs-correction-reason" value={reason} maxLength={MAX_REASON_LENGTH} rows={3}
              placeholder="Jelaskan alasan keterlambatan dan koreksi yang diajukan."
              onChange={(event) => setReason(event.target.value)} disabled={isSubmitting} />
            <p className="abs-permission-hint">{reason.length}/{MAX_REASON_LENGTH} karakter</p>
          </div>
          {loadingApprovers && <p className="abs-permission-hint">Memuat daftar approver...</p>}
          {stages.map((stage) => <div className="abs-permission-field" key={stage.role}>
            <label className="abs-permission-label" htmlFor={`correction-${stage.field}`}>Approver {ROLE_LABELS[stage.role] || stage.role}</label>
            <select id={`correction-${stage.field}`} value={selected[stage.field] || ''}
              onChange={(event) => { setSelected((current) => ({ ...current, [stage.field]: event.target.value })); setErrorMessage(''); }}
              disabled={isSubmitting || (!stage.people.length && !OPTIONAL_STAGES.includes(stage.role))}>
              <option value="">{!stage.people.length && !OPTIONAL_STAGES.includes(stage.role) ? `Belum ada ${ROLE_LABELS[stage.role]} lain yang tersedia` : `Pilih ${ROLE_LABELS[stage.role]}`}</option>
              {OPTIONAL_STAGES.includes(stage.role) && <option value={NO_APPROVER_VALUE}>-</option>}
              {stage.people.map((person) => <option key={person.employeeId} value={person.employeeId}>{person.crossDivision && person.divisionName ? `${person.fullName} — ${person.divisionName}` : person.fullName}</option>)}
            </select>
          </div>)}
          {errorMessage && <p className="abs-permission-error" role="alert">{errorMessage}</p>}
        </div>
        <div className="abs-permission-footer">
          <button type="button" className="abs-permission-cancel" onClick={onClose} disabled={isSubmitting}>Batal</button>
          <button type="button" className="abs-permission-submit" onClick={handleSubmit} disabled={isSubmitting || loadingApprovers || !stages.length || stages.some((stage) => !stage.people.length && !OPTIONAL_STAGES.includes(stage.role))}>
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </div>
    </div>
  );
}
