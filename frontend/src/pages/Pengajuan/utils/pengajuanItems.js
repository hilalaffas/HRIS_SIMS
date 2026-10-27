// src/pages/Pengajuan/utils/pengajuanItems.js
//
// Menggabungkan semua jenis pengajuan karyawan (cuti, izin sakit, izin
// terlambat, lembur) menjadi SATU daftar seragam untuk tabel riwayat di
// halaman Pengajuan, lengkap dengan filter/pencarian dan pembuat model
// kartu/popup detail. Data sumbernya tetap dari service tiap modul
// (CutiService, attendanceService, overtimeService) -- file ini hanya
// menyeragamkan bentuknya.
import { formatDateLabel } from '../../../services/attendanceService';
import { toSafeHttpUrl } from '../../../utils/safeUrl';
import {
  buildLeaveCardModel,
  buildOvertimeCardModel,
  buildShiftSwapCardModel, // [BARU]
  buildSickCardModel,
} from '../../../utils/approvalCardModels';

export const REQUEST_KIND = {
  LEAVE: 'LEAVE',
  SICK: 'SICK',
  LATE: 'LATE',
  OVERTIME: 'OVERTIME',
  SHIFT_SWAP: 'SHIFT_SWAP', // [BARU]
};

// Kunci kartu jenis pengajuan di bagian atas halaman Pengajuan.
export const TYPE_KEY = {
  LEAVE: 'LEAVE',
  PERMISSION: 'PERMISSION',
  OVERTIME: 'OVERTIME',
  SHIFT_SWAP: 'SHIFT_SWAP',
};

export const KIND_META = {
  LEAVE: { label: 'Cuti', tone: 'green' },
  SICK: { label: 'Izin Sakit', tone: 'blue' },
  LATE: { label: 'Izin Terlambat', tone: 'slate' },
  OVERTIME: { label: 'Lembur', tone: 'amber' },
  SHIFT_SWAP: { label: 'Tukar Shift', tone: 'purple' }, // [BARU]
};

export const ROW_ACTION = {
  DETAIL: 'DETAIL',
  UPLOAD_LETTER: 'UPLOAD_LETTER',
};

export const KIND_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Jenis' },
  { value: REQUEST_KIND.LEAVE, label: 'Cuti' },
  { value: REQUEST_KIND.SICK, label: 'Izin Sakit' },
  { value: REQUEST_KIND.LATE, label: 'Izin Terlambat' },
  { value: REQUEST_KIND.OVERTIME, label: 'Lembur' },
  { value: REQUEST_KIND.SHIFT_SWAP, label: 'Tukar Shift' }, // [BARU]
];

export const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'RETURNED', label: 'Dikembalikan' },
  { value: 'LETTER', label: 'Perlu Surat Dokter' },
  { value: 'RECORDED', label: 'Tercatat' },
];

// [BARU] Jenis data (REQUEST_KIND) yang tampil di riwayat tiap tab.
// [UBAH] Cuti & Tukar Shift sekarang ikut memakai tabel riwayat yang sama dengan tab lain.
const TYPE_KINDS = {
  [TYPE_KEY.LEAVE]: [REQUEST_KIND.LEAVE],
  [TYPE_KEY.SHIFT_SWAP]: [REQUEST_KIND.SHIFT_SWAP],
  [TYPE_KEY.PERMISSION]: [REQUEST_KIND.SICK, REQUEST_KIND.LATE],
  [TYPE_KEY.OVERTIME]: [REQUEST_KIND.OVERTIME],
};

const LEAVE_STATUS_CODE = {
  'Dalam Proses': 'PENDING',
  'Disetujui (ACC)': 'APPROVED',
  Ditolak: 'REJECTED',
  Dikembalikan: 'RETURNED',
};

// "2026-10-25T10:34:00.123" -> "2026-10-25T10:34:00" (format seragam untuk urutan)
const toSortKey = (value, fallbackDate) => {
  if (value) return String(value).slice(0, 19);
  return `${String(fallbackDate || '').slice(0, 10)}T00:00:00`;
};

const pad = (value) => String(value).padStart(2, '0');
const dateToSortKey = (date, fallbackDate) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return toSortKey(null, fallbackDate);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const withDetail = (reason, suffix) => (suffix ? `${reason || '-'} (${suffix})` : reason || '-');

// [BARU] Nama jenis cuti untuk kolom "Jenis" (jenisCuti bisa berupa string atau objek { name }).
const getLeaveTypeName = (jenisCuti) => (
  (jenisCuti && typeof jenisCuti === 'object' ? jenisCuti.name : jenisCuti) || 'Cuti'
);

function toLeaveItem(record, leaveDetails, isSupervisorRequester) {
  const detail = leaveDetails[record.id] || null;
  const model = buildLeaveCardModel(record, detail, { isSupervisorRequester });
  const statusCode = LEAVE_STATUS_CODE[record.status] || 'PENDING';
  return {
    key: `leave-${record.id}`,
    kind: REQUEST_KIND.LEAVE,
    refId: record.id,
    sortKey: toSortKey(record.submittedAt, record.rawDetail?.startDate),
    typeLabel: getLeaveTypeName(record.jenisCuti), // [BARU] kolom Jenis = jenis cuti yang dipilih
    // [UBAH] + rentang tanggal cuti, karena kolom Tanggal berisi tanggal pengajuan dikirim
    detailText: withDetail(record.rawDetail?.reason, [record.stringTanggal, record.totalHari].filter(Boolean).join(', ')),
    statusCode,
    statusLabel: model.badgeLabel,
    statusTone: model.tone,
    needsLetter: false,
    requiresApproval: true,
    action: ROW_ACTION.DETAIL,
    source: record,
  };
}

// [BARU] Tukar shift (data lokal sementara, lihat useShiftSwapRequests.js).
// Dua status "menunggu" sama-sama berkode PENDING supaya filter status yang ada tetap berlaku.
const SHIFT_SWAP_STATUS_CODE = {
  PENDING_COLLEAGUE: 'PENDING',
  PENDING_SUPERIOR: 'PENDING',
  REJECTED_COLLEAGUE: 'REJECTED',
};

function toShiftSwapItem(request) {
  const model = buildShiftSwapCardModel(request);
  return {
    key: `shift-${request.id}`,
    kind: REQUEST_KIND.SHIFT_SWAP,
    refId: request.id,
    sortKey: toSortKey(request.createdAt),
    detailText: withDetail(`${request.requesterName} \u2192 ${request.receiverName}`, request.shiftLabel),
    statusCode: SHIFT_SWAP_STATUS_CODE[request.status] || 'PENDING',
    statusLabel: model.badgeLabel,
    statusTone: model.tone,
    needsLetter: false,
    requiresApproval: true,
    action: ROW_ACTION.DETAIL,
    source: request,
  };
}

function toOvertimeItem(record) {
  const model = buildOvertimeCardModel(record);
  return {
    key: `overtime-${record.id}`,
    kind: REQUEST_KIND.OVERTIME,
    refId: record.id,
    sortKey: toSortKey(record.createdAt, record.date),
    detailText: withDetail(record.reason, record.duration),
    statusCode: record.statusCode || 'PENDING',
    statusLabel: model.badgeLabel,
    statusTone: model.tone,
    needsLetter: false,
    requiresApproval: true,
    action: ROW_ACTION.DETAIL,
    source: record,
  };
}

function toSickItem(record) {
  const model = buildSickCardModel(record);
  const needsLetter = record.documentRequired && !record.documentUrl && record.approvalStatus !== 'REJECTED';
  return {
    key: `sick-${record.id}`,
    kind: REQUEST_KIND.SICK,
    refId: record.id,
    sortKey: dateToSortKey(record.recordedAt, record.attendanceDate),
    detailText: withDetail(record.note, `${record.leaveDays} Hari`),
    statusCode: record.approvalStatus || 'PENDING',
    statusLabel: needsLetter ? 'Susul Surat Dokter' : model.badgeLabel,
    statusTone: needsLetter ? 'danger' : model.tone,
    statusEmphasis: needsLetter, // tampil sebagai tombol merah penuh, seperti desain
    needsLetter,
    requiresApproval: true,
    // Aksi izin sakit = unggah surat susulan (selama surat belum ada)
    action: needsLetter ? ROW_ACTION.UPLOAD_LETTER : ROW_ACTION.DETAIL,
    source: record,
  };
}

function toLateItem(record) {
  return {
    key: `late-${record.id}`,
    kind: REQUEST_KIND.LATE,
    refId: record.id,
    sortKey: dateToSortKey(record.recordedAt, record.attendanceDate),
    detailText: record.note || '-',
    statusCode: 'RECORDED',
    statusLabel: 'Tercatat',
    statusTone: 'success',
    needsLetter: false,
    requiresApproval: false,
    action: ROW_ACTION.DETAIL,
    source: record,
  };
}

// Catatan absensi biasa (Masuk/Keluar hadir) TIDAK termasuk pengajuan.
// Sakit = MASUK + reason SAKIT; izin terlambat disimpan sebagai action IZIN.
const isSickRecord = (record) => record.actionCode === 'MASUK' && record.reasonCode === 'SAKIT';
const isLateRecord = (record) => record.actionCode === 'IZIN';

export function buildPengajuanItems({ leaveHistory = [], leaveDetails = {}, overtimeRecords = [], attendanceRecords = [], shiftSwapRequests = [], isSupervisorRequester = false }) {
  const items = [
    ...leaveHistory.map((record) => toLeaveItem(record, leaveDetails, isSupervisorRequester)),
    ...overtimeRecords.map(toOvertimeItem),
    ...shiftSwapRequests.map(toShiftSwapItem), // [BARU]
    ...attendanceRecords.filter(isSickRecord).map(toSickItem),
    ...attendanceRecords.filter(isLateRecord).map(toLateItem),
  ];
  return items.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
}

export const getItemDateLabel = (item) => formatDateLabel(item.sortKey.slice(0, 10));

export function filterPengajuanItems(items, { kind = 'ALL', status = 'ALL', search = '' }) {
  const keyword = search.trim().toLowerCase();
  return items.filter((item) => {
    if (kind !== 'ALL' && item.kind !== kind) return false;
    if (status === 'LETTER' && !item.needsLetter) return false;
    if (status !== 'ALL' && status !== 'LETTER' && item.statusCode !== status) return false;
    if (!keyword) return true;
    const haystack = `${KIND_META[item.kind].label} ${item.typeLabel || ''} ${item.detailText} ${item.statusLabel} ${getItemDateLabel(item)}`.toLowerCase();
    return haystack.includes(keyword);
  });
}

// [BARU] Riwayat per tab: hanya pengajuan yang sesuai jenis tab (urutan terbaru tetap terjaga).
export const filterItemsByType = (items, typeKey) => {
  const kinds = TYPE_KINDS[typeKey] || [];
  return items.filter((item) => kinds.includes(item.kind));
};

// Kartu alur persetujuan hanya untuk pengajuan yang butuh ACC atasan.
export const getCardItems = (items) => items.filter((item) => item.requiresApproval);

export function buildCardModelForItem(item, { leaveDetails = {}, isLatest = false, isSupervisorRequester = false } = {}) {
  if (!item) return null;
  if (item.kind === REQUEST_KIND.LEAVE) {
    return buildLeaveCardModel(item.source, leaveDetails[item.refId] || null, { isLatest, isSupervisorRequester });
  }
  if (item.kind === REQUEST_KIND.OVERTIME) return buildOvertimeCardModel(item.source, { isLatest });
  if (item.kind === REQUEST_KIND.SICK) return buildSickCardModel(item.source, { isLatest });
  if (item.kind === REQUEST_KIND.SHIFT_SWAP) return buildShiftSwapCardModel(item.source, { isLatest }); // [BARU]
  return null;
}

// Isi popup detail untuk lembur / izin sakit / izin terlambat (cuti memakai
// popup FormCuti yang sudah ada). Bentuk: { title, subtitle, statusLabel,
// statusTone, fields[{label,value,accent,href}], sections[{label,value}], steps[] }
export function buildRequestDetail(item, cardModel) {
  const record = item.source;
  const base = { statusLabel: item.statusLabel, statusTone: item.statusTone, steps: cardModel?.steps || [] };

  if (item.kind === REQUEST_KIND.OVERTIME) {
    return {
      ...base,
      title: 'Detail Pengajuan Lembur',
      subtitle: 'Pantau alur persetujuan lembur Anda secara berjenjang',
      fields: [
        { label: 'Tanggal Lembur', value: formatDateLabel(record.date) },
        { label: 'Total Jam', value: record.duration, accent: true },
        { label: 'Jam Mulai', value: record.startTime },
        { label: 'Jam Selesai', value: record.endTime },
      ],
      sections: [
        { label: 'Alasan / Pekerjaan Lembur', value: record.reason },
        { label: 'Waktu Pengajuan', value: cardModel?.sentLabel?.replace('Dikirim ', '') || '-' },
      ],
    };
  }

  if (item.kind === REQUEST_KIND.SICK) {
    return {
      ...base,
      title: 'Detail Pengajuan Izin Sakit',
      subtitle: 'Pantau persetujuan atasan dan kelengkapan surat dokter',
      fields: [
        { label: 'Tanggal Pengajuan', value: formatDateLabel(record.attendanceDate) },
        { label: 'Lama Izin', value: `${record.leaveDays} Hari Kerja`, accent: true },
        {
          label: 'Surat Dokter',
          value: record.documentUrl ? 'Terlampir (buka berkas)' : 'Belum diunggah',
          href: toSafeHttpUrl(record.documentUrl), // hanya http(s), lihat utils/safeUrl.js
        },
        { label: 'Waktu Pengajuan', value: record.time },
      ],
      sections: [{ label: 'Keterangan', value: record.note || '-' }],
    };
  }

  // [BARU] Tukar shift: popup detail memakai langkah dari model kartu (Diajukan -> Rekan -> Atasan)
  if (item.kind === REQUEST_KIND.SHIFT_SWAP) {
    return {
      ...base,
      title: 'Detail Pengajuan Tukar Shift',
      subtitle: 'Pantau persetujuan rekan pengganti dan atasan Anda',
      fields: [
        { label: 'Pemohon', value: record.requesterName },
        { label: 'Rekan Pengganti', value: record.receiverName, accent: true },
        { label: 'Waktu Pengajuan', value: cardModel?.sentLabel?.replace('Dikirim ', '') || '-' },
      ],
      sections: [
        { label: 'Jadwal yang Ditukar', value: record.shiftLabel },
        { label: 'Alasan Tukar Shift', value: record.reason },
      ],
    };
  }

  return {
    ...base,
    title: 'Detail Izin Terlambat',
    subtitle: 'Pemberitahuan terlambat tidak memerlukan persetujuan atasan',
    fields: [
      { label: 'Tanggal', value: formatDateLabel(record.attendanceDate) },
      { label: 'Waktu Dicatat', value: record.time },
    ],
    sections: [{ label: 'Keterangan', value: record.note || '-' }],
  };
}
