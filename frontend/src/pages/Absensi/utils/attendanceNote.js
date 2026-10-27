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

// Status review surat dokter oleh HRD. Backend belum menyediakannya -- selama
// field `documentReviewStatus` kosong, surat yang sudah diunggah dianggap
// menunggu verifikasi.
export const DOCUMENT_REVIEW = {
  PENDING: 'PENDING',
  VALID: 'VALID',
  REJECTED: 'REJECTED',
};

// Status pengajuan koreksi keterlambatan (dummy sampai backend ada).
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
  const href = toSafeUrl(document.url);
  if (!href) {
    return {
      notice: { tone: 'danger', icon: 'alert', label: 'Bukti Belum Diunggah' },
      action: {
        type: 'uploadDocument',
        variant: 'solid',
        label: 'Susul Surat Dokter',
        payload: document.recordId,
      },
    };
  }
  if (document.reviewStatus === DOCUMENT_REVIEW.VALID) {
    return { notice: { tone: 'success', icon: 'check', label: 'Surat Dokter Valid', href }, action: null };
  }
  if (document.reviewStatus === DOCUMENT_REVIEW.REJECTED) {
    return { notice: { tone: 'danger', icon: 'alert', label: 'Surat Ditolak HRD', href }, action: null };
  }
  return { notice: { tone: 'warning', icon: 'hourglass', label: 'Verifikasi HRD (Surat Terlampir)', href }, action: null };
}

function resolveLateCorrection(row, correctionStatus) {
  if (correctionStatus === CORRECTION_STATUS.PENDING) {
    return { notice: { tone: 'warning', icon: 'hourglass', label: 'Koreksi Menunggu HRD' }, action: null };
  }
  if (correctionStatus === CORRECTION_STATUS.APPROVED) {
    return { notice: { tone: 'success', icon: 'check', label: 'Koreksi Disetujui' }, action: null };
  }
  if (correctionStatus === CORRECTION_STATUS.REJECTED) {
    return { notice: { tone: 'danger', icon: 'alert', label: 'Koreksi Ditolak' }, action: null };
  }
  return {
    notice: null,
    action: { type: 'requestCorrection', variant: 'link', label: 'Ajukan Koreksi', payload: row.date },
  };
}

export function resolveNoteMeta(row, { correctionStatus = '' } = {}) {
  const empty = { badge: null, detail: '', notice: null, action: null };
  const hasNote = row.note && row.note !== '-';
  if (!row.tone && !hasNote) return empty;

  // Terlambat: "TERLAMBAT (45 Mnt)" + link Ajukan Koreksi
  if (row.tone === 'telat') {
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
      ...(row.document ? resolveDocumentNotice(row.document) : {}),
    };
  }

  // Hadir tepat waktu: cukup badge hijau; catatan hanya bila ada hal khusus
  if (row.tone === 'hadir') {
    return { ...empty, badge: { label: row.status, tone: 'hadir' }, detail: row.noteDetail || '' };
  }

  // Sisanya (Belum Absen, Menunggu Approval, Ditolak, Cuti, Alpha) -- apa adanya
  return {
    ...empty,
    badge: row.tone ? { label: row.status, tone: row.tone } : null,
    detail: hasNote ? row.note : '',
  };
}
