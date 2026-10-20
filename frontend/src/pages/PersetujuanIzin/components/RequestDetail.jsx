// src/pages/PersetujuanIzin/components/RequestDetail.jsx
//
// [BARU] Panel detail (kanan) untuk satu pengajuan. Dirender dengan `key={row.id}`
// oleh halaman, jadi checklist & catatan otomatis kosong lagi saat pindah
// pengajuan dan animasi masuk diputar ulang.
import React, { useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import AttachmentPreview from './AttachmentPreview';
import VerificationChecklist from './VerificationChecklist';
import DecisionPanel from './DecisionPanel';
import {
  MIN_REJECT_NOTE_LENGTH,
  VERIFICATION_ITEMS,
  formatPeriod,
  formatSubmittedAt,
} from '../utils/permissionRequest';
import './RequestDetail.css';

const EMPTY_CHECKS = Object.fromEntries(VERIFICATION_ITEMS.map((item) => [item.key, false]));

function DecidedBanner({ row }) {
  const approved = row.status === 'APPROVED';
  const Icon = approved ? CircleCheck : CircleX;
  return (
    <div className={`pzn-decided pzn-decided--${approved ? 'approved' : 'rejected'}`}>
      <Icon aria-hidden="true" />
      <div>
        <strong>{approved ? 'Pengajuan disetujui' : 'Pengajuan ditolak'}</strong>
        {row.reviewedAt && <span>{formatSubmittedAt(row.reviewedAt)}</span>}
        {row.reviewNote && <p>{row.reviewNote}</p>}
      </div>
    </div>
  );
}

function RequestDetail({ row, processing, onApprove, onReject }) {
  const [checks, setChecks] = useState(EMPTY_CHECKS);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const isPending = row.status === 'PENDING';
  const needsChecklist = isPending && !!row.attachment;
  const checklistDone = VERIFICATION_ITEMS.every((item) => checks[item.key]);
  const canApprove = !needsChecklist || checklistDone;

  const toggleCheck = (key) => setChecks((current) => ({ ...current, [key]: !current[key] }));

  const handleNoteChange = (value) => {
    setNote(value);
    if (noteError) setNoteError('');
  };

  const handleApprove = () => onApprove(row, note.trim());

  // Mengembalikan false bila catatan belum valid (DecisionPanel lalu memfokuskan kolom catatan).
  const handleReject = () => {
    if (note.trim().length < MIN_REJECT_NOTE_LENGTH) {
      setNoteError('Catatan untuk karyawan wajib diisi saat menolak pengajuan.');
      return false;
    }
    onReject(row, note.trim());
    return true;
  };

  return (
    <article className="pzn-detail">
      <header className="pzn-detail__head">
        <span className={`pzn-detail__avatar avatar-tone-${row.avatarTone}`} aria-hidden="true">{row.initials}</span>
        <div>
          <h2>{row.employeeName}</h2>
          <p>{row.division} · Diajukan {formatSubmittedAt(row.submittedAt)}</p>
        </div>
      </header>

      <dl className="pzn-detail__info">
        <div>
          <dt>Jenis</dt>
          <dd>{row.typeLabel}</dd>
        </div>
        <div>
          <dt>Durasi</dt>
          <dd>{row.workDays} hari kerja</dd>
        </div>
        <div className="pzn-detail__wide">
          <dt>Periode</dt>
          <dd>{formatPeriod(row.startDate, row.endDate)}</dd>
        </div>
        <div className="pzn-detail__wide">
          <dt>Alasan</dt>
          <dd className="pzn-detail__reason">{row.reason}</dd>
        </div>
      </dl>

      <section className="pzn-detail__section">
        <h3 className="pzn-section-label">Bukti Lampiran</h3>
        <AttachmentPreview attachment={row.attachment} />
      </section>

      {isPending ? (
        <>
          {needsChecklist && (
            <section className="pzn-detail__section">
              <VerificationChecklist checked={checks} disabled={processing} onToggle={toggleCheck} />
            </section>
          )}
          <section className="pzn-detail__section">
            <DecisionPanel
              note={note}
              noteError={noteError}
              canApprove={canApprove}
              approveHint="Centang semua poin verifikasi surat terlebih dahulu."
              processing={processing}
              onNoteChange={handleNoteChange}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </section>
        </>
      ) : (
        <section className="pzn-detail__section">
          <DecidedBanner row={row} />
        </section>
      )}
    </article>
  );
}

export default React.memo(RequestDetail);
