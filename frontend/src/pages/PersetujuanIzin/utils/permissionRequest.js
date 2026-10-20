// src/pages/PersetujuanIzin/utils/permissionRequest.js
//
// [BARU] Logika murni (tanpa React) untuk halaman Persetujuan Surat Sakit & Izin:
// pemetaan response backend -> baris tampilan, label jenis, rentang tanggal
// (hari kerja), dan deteksi jenis lampiran. Dipisah dari komponen supaya mudah
// dipakai ulang dan diuji.
import { parseLocalDate, parseNaiveDateTime } from '../../../services/attendanceService';

// Jenis pengajuan. Backend saat ini hanya mengirim SAKIT (reason SAKIT) dan,
// bila nanti ada, IZIN (terlambat) / PRIBADI -- konfigurasi ini sudah siap
// menampilkannya tanpa perubahan UI.
export const REQUEST_TYPES = {
  SAKIT: { label: 'Izin Sakit', tone: 'sick' },
  TERLAMBAT: { label: 'Izin Terlambat', tone: 'late' },
  PRIBADI: { label: 'Izin Keperluan Pribadi', tone: 'personal' },
};

export const TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Jenis' },
  { value: 'SAKIT', label: REQUEST_TYPES.SAKIT.label },
  { value: 'TERLAMBAT', label: REQUEST_TYPES.TERLAMBAT.label },
  { value: 'PRIBADI', label: REQUEST_TYPES.PRIBADI.label },
];

export const STATUS_TABS = [
  { key: 'PENDING', label: 'Menunggu' },
  { key: 'APPROVED', label: 'Disetujui' },
  { key: 'REJECTED', label: 'Ditolak' },
];

export const VERIFICATION_ITEMS = [
  { key: 'name', label: 'Nama pada surat sesuai data karyawan' },
  { key: 'date', label: 'Tanggal surat sesuai periode izin' },
  { key: 'stamp', label: 'Terdapat cap & tanda tangan dokter' },
];

export const MIN_REJECT_NOTE_LENGTH = 3;
export const MAX_REVIEW_NOTE_LENGTH = 500;

const pad = (value) => String(value).padStart(2, '0');
const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

const resolveType = (item) => {
  const explicit = String(item.permissionType || '').toUpperCase();
  if (REQUEST_TYPES[explicit]) return explicit;
  return String(item.reason || '').toUpperCase() === 'SAKIT' ? 'SAKIT' : 'TERLAMBAT';
};

// Tanggal terakhir izin: hari kerja ke-`days` dari `start` (Sabtu/Minggu tidak
// dihitung). Aturan yang sama dengan AttendanceService.getSickEndDate().
export function getLastWorkDay(start, days) {
  let end = start;
  let counted = isWeekend(start) ? 0 : 1;
  while (counted < days) {
    end = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
    if (!isWeekend(end)) counted += 1;
  }
  return end;
}

const formatDay = (date) => date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

// "29 Sep 2026, 07:12"
export function formatSubmittedAt(date) {
  if (!date) return '-';
  return `${formatDay(date)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// "29 Sep 2026 – 30 Sep 2026" atau "07 Okt 2026" bila hanya satu hari.
export function formatPeriod(start, end) {
  if (!start) return '-';
  const sameDay = !end || start.getTime() === end.getTime();
  return sameDay ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
}

const PDF_PATTERN = /\.pdf$/i;

export function describeAttachment(url) {
  if (!url) return null;
  const cleanPath = String(url).split('?')[0].split('#')[0];
  let fileName = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
  try {
    fileName = decodeURIComponent(fileName);
  } catch {
    /* nama file tidak ter-encode -- pakai apa adanya */
  }
  const isPdf = PDF_PATTERN.test(cleanPath);
  // Selain PDF dianggap gambar (URL Cloudinary sering tanpa ekstensi); bila gambar
  // gagal dimuat, AttachmentPreview otomatis menampilkan kartu berkas sebagai cadangan.
  return { url, fileName: fileName || 'Lampiran', isPdf, isImage: !isPdf };
}

const getInitials = (name) => String(name || '?')
  .split(' ')
  .filter(Boolean)
  .map((part) => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase() || '?';

// Warna avatar stabil per nama (0-3) -> kelas `avatar-tone-N`.
const getAvatarTone = (name) => {
  let hash = 0;
  for (const char of String(name || '')) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return hash % 4;
};

// Response backend (AttendanceResponse) -> baris tampilan.
export function toPermissionRow(item) {
  const type = resolveType(item);
  const start = parseLocalDate(item.attendanceDate);
  const workDays = item.leaveDays || 1;
  const end = start ? getLastWorkDay(start, workDays) : null;
  const attachment = describeAttachment(item.documentUrl || item.photoUrl);
  const employeeName = item.employeeName || '-';

  return {
    id: item.attendanceId,
    employeeName,
    division: item.divisionName || '-',
    initials: getInitials(employeeName),
    avatarTone: getAvatarTone(employeeName),
    type,
    typeLabel: REQUEST_TYPES[type].label,
    typeTone: REQUEST_TYPES[type].tone,
    status: String(item.approvalStatus || '').toUpperCase(),
    submittedAt: parseNaiveDateTime(item.recordedAt),
    startDate: start,
    endDate: end,
    workDays,
    reason: item.note || '-',
    attachment,
    reviewNote: item.reviewNote || '',
    reviewedAt: parseNaiveDateTime(item.reviewedAt),
  };
}

// Menunggu: yang paling lama menunggu di atas (antrean). Lainnya: terbaru di atas.
export function sortRows(a, b) {
  const aPending = a.status === 'PENDING';
  const bPending = b.status === 'PENDING';
  if (aPending && bPending) return (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0);
  if (aPending !== bPending) return aPending ? -1 : 1;
  const aTime = (a.reviewedAt || a.submittedAt)?.getTime() ?? 0;
  const bTime = (b.reviewedAt || b.submittedAt)?.getTime() ?? 0;
  return bTime - aTime;
}

// Diproses bulan ini: keputusan (disetujui/ditolak) yang dibuat di bulan berjalan.
// Data lama sebelum migrasi V48 belum punya `reviewedAt` -> pakai tanggal pengajuan.
export function isProcessedThisMonth(row, now = new Date()) {
  if (row.status === 'PENDING') return false;
  const reference = row.reviewedAt || row.submittedAt;
  return !!reference
    && reference.getFullYear() === now.getFullYear()
    && reference.getMonth() === now.getMonth();
}

export function matchesFilters(row, { type, query }) {
  if (type !== 'ALL' && row.type !== type) return false;
  const keyword = query.trim().toLowerCase();
  return !keyword || row.employeeName.toLowerCase().includes(keyword);
}
