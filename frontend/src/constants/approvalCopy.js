// src/constants/approvalCopy.js
//
// [BARU] Teks popup konfirmasi (ActionReasonModal) untuk aksi Setujui / Tolak di "Perlu Diproses".
// Dipakai PendingQueueSection.jsx lewat `request.copy`.
//   - approve : konfirmasi dulu, catatan OPSIONAL (reasonRequired: false)
//   - reject  : konfirmasi + alasan WAJIB (minimal 5 karakter, sama dengan aturan backend)
// Cuti memakai teks bawaan modal, jadi tidak ada di sini.
import { OVERTIME_REJECT_COPY } from './overtimeFlow';

const MAX_NOTE_LENGTH = 500; // selaras batas catatan di backend

export const APPROVAL_COPY = {
  overtime: {
    approve: {
      modalTitle: 'Setujui Pengajuan Lembur',
      modalSubtitle: 'Pastikan Anda sudah memeriksa pengajuan ini sebelum menyetujui.',
      placeholder: 'Contoh: Disetujui, mohon pastikan pekerjaan lembur selesai tepat waktu.',
      helperText: 'Catatan bersifat opsional dan akan tercatat di riwayat log yang dilihat pemohon.',
      reasonRequired: false,
      maxLength: MAX_NOTE_LENGTH,
    },
    reject: { ...OVERTIME_REJECT_COPY, maxLength: MAX_NOTE_LENGTH },
  },
  correction: {
    approve: {
      modalTitle: 'Setujui Koreksi Absensi',
      modalSubtitle: 'Koreksi yang disetujui akan mengubah status kehadiran menjadi tepat waktu.',
      placeholder: 'Contoh: Bukti keterlambatan sudah sesuai.',
      helperText: 'Catatan bersifat opsional dan akan tercatat di riwayat log yang dilihat pemohon.',
      reasonRequired: false,
      maxLength: MAX_NOTE_LENGTH,
    },
    reject: {
      modalTitle: 'Tolak Koreksi Absensi',
      modalSubtitle: 'Berikan alasan penolakan yang jelas untuk pemohon.',
      placeholder: 'Contoh: Bukti keterlambatan tidak sesuai dengan data absensi.',
      helperText: 'Alasan penolakan wajib diisi dan akan tercatat di riwayat log yang dilihat pemohon.',
      maxLength: MAX_NOTE_LENGTH,
    },
  },
};
