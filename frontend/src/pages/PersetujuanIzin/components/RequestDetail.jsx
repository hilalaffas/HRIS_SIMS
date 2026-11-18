// src/pages/PersetujuanIzin/components/RequestDetail.jsx
//
// [BARU] Panel detail (kanan) untuk satu pengajuan. Dirender dengan `key={row.id}`
// oleh halaman, jadi catatan otomatis kosong lagi saat pindah
// pengajuan dan animasi masuk diputar ulang.
import React, { useState } from 'react';
import { CircleCheck, CircleX, Hourglass } from 'lucide-react';
import AttachmentPreview from './AttachmentPreview';
import DecisionPanel from './DecisionPanel';
import {
  MIN_REJECT_NOTE_LENGTH,
  formatPeriod,
  formatSubmittedAt,
} from '../utils/permissionRequest';
import ApprovalLogAccordion from '../../../components/ApprovalLogAccordion';
import { buildPermissionLogs, permissionFileStatus } from '../../../utils/permissionReviewLog';
import './RequestDetail.css';

function DecidedBanner({ row }) {
  const status = permissionFileStatus(row);
  const Icon = status.statusTone === 'success' ? CircleCheck : status.statusTone === 'danger' ? CircleX : Hourglass;
  const bannerTone = { success: 'approved', danger: 'rejected' }[status.statusTone] || status.statusTone;
  return (
    <div className={`pzn-decided pzn-decided--${bannerTone}`}>
      <Icon aria-hidden="true" />
      <div>
        <strong>{status.label}</strong>
        {row.reviewedAt && <span>{formatSubmittedAt(row.reviewedAt)}</span>}
        {row.reviewNote && <p>{row.reviewNote}</p>}
      </div>
    </div>
  );
}

function RequestDetail({ row, processing, onApprove, onReject }) {
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const fileStatus = permissionFileStatus(row);
  const isPending = row.status === 'PENDING';
  const isDocumentReview = row.documentReviewPending;
  const canApprove = row.document.code !== 'EXPIRED';

  const handleNoteChange = (value) => {
    setNote(value);
    if (noteError) setNoteError('');
  };

  const handleApprove = () => onApprove(row, note.trim());

  // Mengembalikan false bila catatan belum valid (DecisionPanel lalu memfokuskan kolom catatan).
  const handleReject = () => {
    if (note.trim().length < MIN_REJECT_NOTE_LENGTH) {
      setNoteError('Catatan untuk karyawan wajib diisi saat menolak.');
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

      <div><span className={`pgj-detail-status pgj-detail-status--${fileStatus.statusTone}`}>{fileStatus.label}</span></div>
      <dl className="pzn-detail__info">
        <div>
          <dt>Jenis</dt>
          <dd>{row.typeLabel}</dd>
        </div>
        <div>
          <dt>Durasi</dt>
          <dd>{row.workDays} {row.durationUnit || 'hari kerja'}</dd>
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
        <h3 className="pzn-section-label">{row.type === 'SAKIT' ? 'Bukti Lampiran' : 'Bukti Terlambat'}</h3>
        <AttachmentPreview attachment={row.attachment} />
      </section>

      {row.type === 'SAKIT' && <section className="pzn-detail__section">
        <h3 className="pzn-section-label">Status Surat Dokter</h3>
        <p>{row.document.label}</p>
        {row.document.deadline && <p className="pzn-detail__reason">Batas upload: {row.document.deadline.split('-').reverse().join('/')} pukul 23.59 WIB.</p>}
        {row.document.periodLabel && <p className="pzn-detail__reason"><strong>Periode pada surat: </strong>{row.document.periodLabel}</p>}
        {isDocumentReview && row.document.periodLabel && <p className="pzn-detail__reason">Periode izin saat ini: {formatPeriod(row.startDate, row.endDate)}. Validasi surat juga menyetujui periode pada surat di atas.</p>}
        {row.document.note && <p className="pzn-detail__reason">Catatan HRD: {row.document.note}</p>}
        {row.documentReviewedAt && <small>{formatSubmittedAt(row.documentReviewedAt)}</small>}
      </section>}
      {isDocumentReview && <section className="pzn-detail__section"><DecidedBanner row={row} /></section>}
      {isPending || isDocumentReview ? (
        <>
          <section className="pzn-detail__section">
            <DecisionPanel
              approveLabel={isDocumentReview ? "Validasi Surat" : "Setujui Izin"}
              rejectLabel={isDocumentReview ? "Tolak Surat" : "Tolak Izin"}
              note={note}
              noteError={noteError}
              canApprove={canApprove}
              approveHint="Batas upload surat dokter sudah terlewati."
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
      <ApprovalLogAccordion logs={buildPermissionLogs(row.source)} />
    </article>
  );
}

export default React.memo(RequestDetail);
