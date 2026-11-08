import React, { useEffect, useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { getApprovers } from '../../../services/CutiService';
import { getMyProfile } from '../../../services/profileService';
import './PermissionRequestModal.css';

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

export default function CorrectionRequestModal({ dateLabel, lateLabel, onSubmit, onClose }) {
  const submitLockRef = useRef(false);
  const [reason, setReason] = useState('');
  const [approvers, setApprovers] = useState({ LEADER: [], SPV: [], MANAGER: [] });
  const [selected, setSelected] = useState({ leaderEmployeeId: '', spvEmployeeId: '', managerEmployeeId: '' });
  const [loadingApprovers, setLoadingApprovers] = useState(true);
  const [requesterRole, setRequesterRole] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const loadApprovers = async () => {
      try {
        const profile = await getMyProfile();
        const rawRole = String(profile?.jabatan || '').trim().toUpperCase().replace(/^ROLE_/, '');
        const role = rawRole.includes('LEADER') ? 'LEADER'
          : (rawRole.includes('SPV') || rawRole.includes('SUPERVISOR')) ? 'SPV'
            : rawRole.includes('MANAGER') ? 'MANAGER' : 'EMPLOYEE';
        if (active) setRequesterRole(role);

        // Pilihan approver hanya menampilkan jenjang di atas pengaju.
        // Manager hanya dapat memilih manager lain, bukan dirinya sendiri.
        const visibleRoles = role === 'LEADER' ? ['SPV', 'MANAGER']
          : role === 'SPV' ? ['MANAGER']
            : role === 'MANAGER' ? ['MANAGER'] : ['LEADER', 'SPV', 'MANAGER'];
        const items = await Promise.all(visibleRoles.map(async (approverRole) => {
          const people = await getApprovers(approverRole);
          return [approverRole, (people || []).filter((person) =>
            profile?.employeeId == null || Number(person.employeeId) !== Number(profile.employeeId))];
        }));
        if (active) setApprovers({ LEADER: [], SPV: [], MANAGER: [], ...Object.fromEntries(items) });
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
    const requiredKeys = requesterRole === 'LEADER' ? ['spvEmployeeId', 'managerEmployeeId']
      : requesterRole === 'SPV' || requesterRole === 'MANAGER' ? ['managerEmployeeId']
        : ['leaderEmployeeId', 'spvEmployeeId', 'managerEmployeeId'];
    if (requiredKeys.some((key) => !selected[key])) {
      const requiredLabels = requiredKeys.map((key) => key === 'leaderEmployeeId' ? 'Leader' : key === 'spvEmployeeId' ? 'SPV' : (requesterRole === 'MANAGER' ? 'Manager lain' : 'Manager'));
      return setErrorMessage(`Pilih nama ${requiredLabels.join(', ')} terlebih dahulu.`);
    }
    submitLockRef.current = true; setIsSubmitting(true); setErrorMessage('');
    try { await onSubmit({
      reason: trimmedReason,
      ...(requiredKeys.includes('leaderEmployeeId') ? { leaderEmployeeId: Number(selected.leaderEmployeeId) } : {}),
      ...(requiredKeys.includes('spvEmployeeId') ? { spvEmployeeId: Number(selected.spvEmployeeId) } : {}),
      ...(requiredKeys.includes('managerEmployeeId') ? { managerEmployeeId: Number(selected.managerEmployeeId) } : {}),
    }); }
    catch (error) { setErrorMessage(error?.message || 'Gagal mengirim pengajuan koreksi.'); }
    finally { submitLockRef.current = false; setIsSubmitting(false); }
  };

  const fields = requesterRole === 'LEADER'
    ? [['SPV', 'spvEmployeeId', 'SPV'], ['MANAGER', 'managerEmployeeId', 'Manager']]
    : requesterRole === 'SPV'
      ? [['MANAGER', 'managerEmployeeId', 'Manager']]
      : requesterRole === 'MANAGER'
        ? [['MANAGER', 'managerEmployeeId', 'Manager lain']]
        : [['LEADER', 'leaderEmployeeId', 'Leader'], ['SPV', 'spvEmployeeId', 'SPV'], ['MANAGER', 'managerEmployeeId', 'Manager']];

  return (
    <div className="abs-permission-backdrop" role="presentation">
      <div className="abs-permission-modal" role="dialog" aria-modal="true" aria-labelledby="abs-correction-title">
        <div className="abs-permission-header">
          <h2 id="abs-correction-title"><Pencil aria-hidden="true" /> Ajukan Koreksi Absensi</h2>
          <button type="button" aria-label="Tutup" onClick={onClose} disabled={isSubmitting}><X aria-hidden="true" /></button>
        </div>
        <div className="abs-permission-body">
          <p className="abs-permission-hint">Absensi tanggal {dateLabel} tercatat terlambat{lateLabel ? ` (${lateLabel})` : ''}. Pilih approver sesuai jenjang jabatan Anda. Persetujuan diproses berurutan sesuai alur organisasi.</p>
          <div className="abs-permission-field">
            <label className="abs-permission-label" htmlFor="abs-correction-reason">Alasan koreksi</label>
            <textarea id="abs-correction-reason" value={reason} maxLength={MAX_REASON_LENGTH} rows={3}
              placeholder="Jelaskan alasan keterlambatan dan koreksi yang diajukan."
              onChange={(event) => setReason(event.target.value)} disabled={isSubmitting} />
            <p className="abs-permission-hint">{reason.length}/{MAX_REASON_LENGTH} karakter</p>
          </div>
          {fields.map(([role, key, label]) => (
            <div className="abs-permission-field" key={role}>
              <label className="abs-permission-label" htmlFor={`correction-${key}`}>Approval {label}</label>
              <select id={`correction-${key}`} value={selected[key]}
                onChange={(event) => setSelected((current) => ({ ...current, [key]: event.target.value }))}
                disabled={isSubmitting || loadingApprovers}>
                <option value="">{loadingApprovers ? 'Memuat...' : `Pilih ${label}`}</option>
                {(approvers[role] || []).map((person) => (
                  <option key={person.employeeId} value={person.employeeId}>{person.fullName}</option>
                ))}
              </select>
            </div>
          ))}
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
