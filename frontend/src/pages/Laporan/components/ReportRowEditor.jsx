import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FilePenLine, X } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import { saveReportRevision } from '../../../services/attendanceReportService';
import { REPORT_STATUS_OPTIONS } from '../utils/reportEdits';
import '../../Absensi/components/PermissionRequestModal.css';

export default function ReportRowEditor({ row, report, onClose, onSaved }) {
  const [shiftId, setShiftId] = useState(String(row.shiftId ?? ''));
  const [status, setStatus] = useState(REPORT_STATUS_OPTIONS.some((s) => s.value === row.status) ? row.status : '');
  const [note, setNote] = useState(row.note || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    if (!reason.trim()) { setError('Alasan perubahan wajib diisi.'); return; }
    const changed = (row.canEditShift && shiftId !== String(row.shiftId ?? ''))
      || (row.canEditStatus && status && status !== row.status)
      || (row.canEditNote && note.trim() !== (row.note || '').trim());
    if (!changed) { setError('Tidak ada perubahan untuk disimpan.'); return; }
    lock.current = true; setSaving(true); setError('');
    try {
      await saveReportRevision(report.employeeId, {
        date: row.date,
        shiftId: row.canEditShift && shiftId ? Number(shiftId) : null,
        expectedShiftId: row.shiftId,
        status: row.canEditStatus && status ? status : null,
        note: row.canEditNote ? note : null,
        reason: reason.trim(), expectedRevision: row.revisionId,
      });
      onSaved();
    } catch (failure) { setError(failure.message || 'Gagal menyimpan perubahan laporan.'); }
    finally { lock.current = false; setSaving(false); }
  };
  const shiftOptions = row.shiftOptions.map((s) => ({ value: String(s.shiftId), label: `${s.shiftName} (${s.startTime?.slice(0, 5)}–${s.endTime?.slice(0, 5)})` }));
  if (!shiftOptions.some((s) => s.value === shiftId)) shiftOptions.unshift({ value: shiftId, label: row.shift });
  return createPortal(<dialog ref={dialogRef} className="abs-permission-modal lpr-edit-dialog" aria-labelledby="lpr-edit-title"
    onCancel={(event) => { event.preventDefault(); if (!lock.current) onClose(); }}>
    <form onSubmit={submit}>
      <header className="abs-permission-header">
        <h2 id="lpr-edit-title"><FilePenLine aria-hidden="true" />Edit/Sanggah Laporan</h2>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Tutup edit laporan"><X /></button>
      </header>
      <div className="abs-permission-body">
        <p className="abs-permission-hint">{report.fullName} · {row.dateLabel}</p>
        <div className="abs-permission-field">
          <span className="abs-permission-label">Jadwal Shift</span>
          <Dropdown name="reportEditShift" value={shiftId} options={shiftOptions}
            onChange={(event) => setShiftId(event.target.value)} disabled={saving || !row.canEditShift} ariaLabel="Jadwal shift" />
          <p className="abs-permission-hint">{row.canEditShift ? 'Perubahan memperbarui jadwal kerja asli karyawan.' : report.divisionType === 'SHIFTING' ? 'Shift hari ini dan sebelumnya tidak dapat diganti.' : 'Shift normal tidak dapat diganti.'}</p>
        </div>
        <div className="abs-permission-field">
          <span className="abs-permission-label">Status</span>
          <Dropdown name="reportEditStatus" value={status}
            options={status ? REPORT_STATUS_OPTIONS : [{ value: '', label: row.status }, ...REPORT_STATUS_OPTIONS]}
            onChange={(event) => setStatus(event.target.value)} disabled={saving || !row.canEditStatus} ariaLabel="Status kehadiran" />
          {!row.canEditStatus && <p className="abs-permission-hint">{row.canEditNote ? 'Status ini mengikuti proses pengajuan dan approval.' : 'Status hanya bisa diedit untuk hari ini atau sebelumnya (WIB).'}</p>}
        </div>
        <div className="abs-permission-field">
          <label htmlFor="reportEditNote" className="abs-permission-label">Keterangan</label>
          <textarea id="reportEditNote" rows={3} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} disabled={saving || !row.canEditNote} />
          {!row.canEditNote && <p className="abs-permission-hint">Keterangan belum dapat diedit untuk tanggal mendatang.</p>}
        </div>
        <div className="abs-permission-field">
          <label htmlFor="reportEditReason" className="abs-permission-label">Alasan perubahan *</label>
          <textarea id="reportEditReason" rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving} required />
        </div>
        {error && <p className="abs-permission-error" role="alert">{error}</p>}
      </div>
      <footer className="abs-permission-footer">
        <button type="button" className="abs-permission-cancel" onClick={onClose} disabled={saving}>Batal</button>
        <button type="submit" className="abs-permission-submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
      </footer>
    </form>
  </dialog>, document.body);
}
