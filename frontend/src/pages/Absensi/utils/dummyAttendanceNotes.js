// src/pages/Absensi/utils/dummyAttendanceNotes.js
//
// [BARU][SEMENTARA] Data dummy untuk mempratinjau kolom "Keterangan / Catatan"
// TANPA backend. Hapus file ini (dan 2 baris pemakaiannya di
// AttendanceHistoryTable.jsx) setelah backend menyediakan:
//   - attendance.documentReviewStatus  (PENDING | VALID | REJECTED)
//   - endpoint pengajuan koreksi keterlambatan
//
// Cara menyalakan (hanya saat `npm run dev`, tidak pernah ikut build produksi):
//   frontend/.env.local ->  VITE_ABSENSI_NOTE_DEMO=true
import { formatDateLabel } from '../../../services/attendanceService';
import { SHIFT_LABEL, dateKey } from './monthlyAttendance';

export const IS_NOTE_DEMO_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ABSENSI_NOTE_DEMO === 'true';

const emptyRow = {
  checkIn: null,
  checkOut: null,
  duration: null,
  durationMinutes: null,
  lateMinutes: 0,
  note: '-',
  noteDetail: '',
  photoUrl: '',
  mapsUrl: '',
  locationName: '',
  proofLabel: '',
  document: null,
  overtime: null,
};

function daysAgo(count) {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - count);
}

// Lima skenario sesuai desain: hadir, terlambat, sakit tanpa bukti,
// sakit menunggu verifikasi HRD, sakit dengan surat valid.
export function buildDemoNoteRows() {
  const scenarios = [
    { offset: 0, checkIn: '07:45:12', status: 'HADIR TEPAT WAKTU', tone: 'hadir' },
    { offset: 1, checkIn: '08:45:30', checkOut: '17:30:10', duration: '8 Jam 44 Mnt', durationMinutes: 524, status: 'TERLAMBAT', tone: 'telat', lateMinutes: 45 },
    { offset: 2, status: 'SAKIT', tone: 'sakit', note: 'Sakit', document: { recordId: -1, url: '', reviewStatus: '' } },
    { offset: 5, status: 'SAKIT', tone: 'sakit', note: 'Sakit', document: { recordId: -2, url: 'https://example.com/surat-dokter.pdf', reviewStatus: 'PENDING' } },
    { offset: 6, status: 'SAKIT', tone: 'sakit', note: 'Sakit', document: { recordId: -3, url: 'https://example.com/surat-dokter.pdf', reviewStatus: 'VALID' } },
  ];

  return scenarios.map(({ offset, ...scenario }) => {
    const date = daysAgo(offset);
    const key = dateKey(date);
    return { ...emptyRow, ...scenario, date: key, dateLabel: formatDateLabel(key), isToday: offset === 0, shift: SHIFT_LABEL };
  });
}
