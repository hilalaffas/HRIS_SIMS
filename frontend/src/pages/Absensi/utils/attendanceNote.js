// src/pages/Absensi/utils/attendanceNote.js
//
// [BARU] Logika murni (tanpa React) untuk kolom "Keterangan / Catatan" tabel
// riwayat absensi. Satu fungsi, resolveNoteMeta(row, options), mengubah SATU
// baris harian menjadi struktur siap tampil:
//
//   {
//     badge:  { label, tone } | null,             // badge status (Hadir / Terlambat / Sakit ...)
//     detail: string,                              // catatan kecil di bawah badge
//     notice: { tone, icon, label, href? } | null, // baris status kecil (bukti belum diunggah, verifikasi HRD ...)
//     action: { type, variant, label, payload } | null, // tombol / link aksi
//   }
//
// Komponen (AttendanceNoteCell.jsx) hanya menggambar hasilnya, sehingga aturan
// bisnis tampilan ada di satu tempat dan mudah diuji.
//
// Contoh pemakaian:
//   const meta = resolveNoteMeta(row, { correctionStatus: 'PENDING' });
import { formatDuration } from './monthlyAttendance';

// Status verifikasi surat dokter terpisah dari persetujuan izin sakit.
export const DOCUMENT_REVIEW = {
  PENDING: 'PENDING',
  VALID: 'VALID',
  REJECTED: 'REJECTED',
};

// Status pengajuan koreksi keterlambatan dari backend attendance_corrections.
export const CORRECTION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

// Keamanan: link bukti hanya boleh http(s). Nilai lain (javascript:, data:, dst)
// dibuang supaya tidak bisa disisipkan lewat field URL dari server.
export function toSafeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

// Catatan polos yang tidak perlu diulang di bawah badge.
const PLAIN_NOTES = new Set(['', '-', 'Sakit', 'Izin']);

function resolveDocumentNotice(document) {
  if (document.expired) return { notice: { tone: 'danger', icon: 'alert', label: 'Batas upload surat dokter terlewati' }, action: null };
  const href = toSafeUrl(document.url);
  const period = document.startDate && document.endDate ? ` · Periode surat: ${document.startDate.split('-').reverse().join('/')} – ${document.endDate.split('-').reverse().join('/')}` : '';
  if (!href) {
    return {
      notice: { tone: 'danger', icon: 'alert', label: 'Bukti Belum Diunggah' },
      action: {
        type: 'uploadDocument',
        variant: 'solid',
        label: 'Upload Surat Sakit',
        payload: document.recordId,
      },
    };
  }
  if (document.reviewStatus === DOCUMENT_REVIEW.VALID) {
    return { notice: { tone: 'success', icon: 'check', label: 'Surat Dokter Valid', href }, action: null };
  }
  if (document.reviewStatus === DOCUMENT_REVIEW.REJECTED) {
    return { notice: { tone: 'danger', icon: 'alert', label: `Surat Ditolak HRD${document.reviewNote ? `: ${document.reviewNote}` : ''}`, href }, action: { type: 'uploadDocument', variant: 'solid', label: 'Upload Ulang Surat Sakit', payload: document.recordId } };
  }
  return { notice: { tone: 'warning', icon: 'hourglass', label: `Verifikasi HRD (Surat Terlampir)${period}`, href }, action: null };
}

function resolveLateCorrection(row, correctionStatus) {
  const status = typeof correctionStatus === 'string' ? correctionStatus : correctionStatus?.status;
  const approverRole = typeof correctionStatus === 'object' ? correctionStatus?.currentApproverRole : '';
  if (status === CORRECTION_STATUS.PENDING) {
    return { notice: { tone: 'warning', icon: 'hourglass', label: approverRole ? `Menunggu Persetujuan ${approverRole}` : 'Koreksi Menunggu Persetujuan' }, action: null };
  }
  if (status === CORRECTION_STATUS.APPROVED) {
    return { notice: { tone: 'success', icon: 'check', label: 'Koreksi Disetujui' }, action: null };
  }
  if (status === CORRECTION_STATUS.REJECTED) {
    return { notice: { tone: 'danger', icon: 'alert', label: 'Koreksi Ditolak' }, action: null };
  }
  return {
    notice: null,
    action: { type: 'requestCorrection', variant: 'solid', label: 'Ajukan Koreksi', payload: row.date },
  };
}

function resolveBaseNoteMeta(row, { correctionStatus = '' } = {}) {
  const empty = { badge: null, detail: '', notice: null, action: null };
  const hasNote = row.note && row.note !== '-';
  if (!row.tone && !hasNote) return empty;

  // Terlambat: "TERLAMBAT (45 Mnt)" + link Ajukan Koreksi
  if (row.tone === 'telat') {
    const correction = typeof correctionStatus === 'string' ? correctionStatus : correctionStatus?.status;
    if (correction === CORRECTION_STATUS.APPROVED) {
      return {
        ...empty,
        badge: { label: 'HADIR TEPAT WAKTU', tone: 'hadir' },
        detail: [row.noteDetail, 'Koreksi keterlambatan disetujui'].filter(Boolean).join(' · '),
        notice: { tone: 'success', icon: 'check', label: 'Koreksi Disetujui' },
        action: null,
      };
    }
    const minutes = row.lateMinutes > 0 ? ` (${formatDuration(row.lateMinutes)})` : '';
    return {
      ...empty,
      badge: { label: `TERLAMBAT${minutes}`, tone: 'telat' },
      detail: row.noteDetail || '',
      ...resolveLateCorrection(row, correctionStatus),
    };
  }

  // Sakit yang sudah disetujui: status surat dokter
  if (row.tone === 'sakit') {
    const detail = PLAIN_NOTES.has(row.note) ? '' : row.note;
    return {
      ...empty,
      badge: { label: row.status, tone: 'sakit' },
      detail,
    };
  }

  // Hadir tepat waktu: cukup badge hijau; catatan hanya bila ada hal khusus
  if (row.tone === 'hadir') {
    const correction = typeof correctionStatus === 'string' ? correctionStatus : correctionStatus?.status;
    return {
      ...empty,
      badge: { label: row.status, tone: 'hadir' },
      detail: row.noteDetail || '',
      ...(correction === CORRECTION_STATUS.APPROVED
        ? { notice: { tone: 'success', icon: 'check', label: 'Koreksi Disetujui' } }
        : {}),
    };
  }

  // Sisanya (Belum Absen, Menunggu Approval, Ditolak, Cuti, Alpha) -- apa adanya
  return {
    ...empty,
    badge: row.tone ? { label: row.status, tone: row.tone } : null,
    detail: hasNote ? row.note : '',
  };
}

// Document submission is available while approval is pending and alongside
// attendance corrections for an employee who went home sick after checking in.
export function resolveNoteMeta(row, options = {}) {
  const meta = resolveBaseNoteMeta(row, options);
  const document = row.document ? resolveDocumentNotice(row.document) : null;
  return {
    ...meta,
    notices: [meta.notice, document?.notice].filter(Boolean),
    actions: [meta.action, document?.action].filter(Boolean),
  };
}
