// src/pages/Absensi/components/AttendanceNoteCell.jsx
//
// [BARU] Sel "Keterangan / Catatan" pada tabel riwayat absensi (dipindah dari
// AttendanceHistoryTable.jsx). Hanya menggambar hasil resolveNoteMeta() --
// aturan tampilannya ada di ../utils/attendanceNote.js.
//
// Susunan (atas -> bawah): badge status, catatan kecil, baris status
// (mis. "Bukti Belum Diunggah"), tombol aksi, chip Foto & Peta.
//
// Contoh pemakaian:
// <AttendanceNoteCell row={row} correctionStatus="PENDING"
//   onUploadDocument={(recordId) => ...} onRequestCorrection={(date) => ...} />
import React from 'react';
import { CircleCheck, Hourglass, MapPin, Pencil, TriangleAlert, Upload } from 'lucide-react';
import { resolveNoteMeta, toSafeUrl } from '../utils/attendanceNote';
import './AttendanceNoteCell.css';

const NOTICE_ICONS = {
  alert: TriangleAlert,
  hourglass: Hourglass,
  check: CircleCheck,
};

function ProofLinks({ row }) {
  const photoUrl = toSafeUrl(row.photoUrl);
  const mapsUrl = toSafeUrl(row.mapsUrl);
  if (!photoUrl && !mapsUrl) return null;
  return (
    <div className="abs-link-stack">
      {photoUrl && (
        <a className="abs-photo-link" href={photoUrl} target="_blank" rel="noopener noreferrer">
          <CircleCheck aria-hidden="true" />
          {row.proofLabel || 'Selfie GPS'}
        </a>
      )}
      {mapsUrl && (
        <a className="abs-maps-pin" href={mapsUrl} target="_blank" rel="noopener noreferrer" title={row.locationName || undefined}>
          <MapPin aria-hidden="true" />
          Peta
        </a>
      )}
    </div>
  );
}

function NoteNotice({ notice }) {
  const Icon = NOTICE_ICONS[notice.icon];
  const content = (
    <>
      <Icon aria-hidden="true" />
      {notice.label}
    </>
  );
  if (notice.href) {
    return (
      <a className={`abs-note-notice abs-notice-${notice.tone} is-link`} href={notice.href} target="_blank" rel="noopener noreferrer" title="Buka surat dokter">
        {content}
      </a>
    );
  }
  return <span className={`abs-note-notice abs-notice-${notice.tone}`}>{content}</span>;
}

export default function AttendanceNoteCell({ row, correctionStatus, onUploadDocument, onRequestCorrection }) {
  const { badge, detail, notice, action } = resolveNoteMeta(row, { correctionStatus });
  const hasProof = Boolean(row.photoUrl || row.mapsUrl);
  if (!badge && !detail && !notice && !action && !hasProof) return <span className="abs-empty-cell">-</span>;

  const handleAction = () => {
    if (action.type === 'uploadDocument') onUploadDocument(action.payload);
    if (action.type === 'requestCorrection') onRequestCorrection(action.payload);
  };

  return (
    <div className="abs-note-stack">
      {badge && <span className={`abs-record-status abs-status-${badge.tone}`}>{badge.label}</span>}
      {detail && <span className="abs-note-text">{detail}</span>}
      {notice && <NoteNotice notice={notice} />}
      {action && (
        <button type="button" className={`abs-note-action abs-action-${action.variant}`} onClick={handleAction}>
          {action.type === 'uploadDocument' ? <Upload aria-hidden="true" /> : <Pencil aria-hidden="true" />}
          {action.label}
        </button>
      )}
      <ProofLinks row={row} />
    </div>
  );
}
