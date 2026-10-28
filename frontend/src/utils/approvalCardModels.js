// src/utils/approvalCardModels.js
//
// [BARU] Adapter: mengubah data tiap jenis pengajuan (lembur, cuti, izin sakit)
// menjadi `model` untuk components/ApprovalStatusCard.jsx. Semua aturan "apa
// arti status ini bagi kartu" ada di sini, bukan di komponen tampilan.
import { formatDateLabel } from '../services/attendanceService';
import { buildTimeline, getStatusMeta, resolveFlowState } from '../constants/overtimeFlow';

// "2026-10-05T20:05:11" -> "05 Okt 2026, 20:05 WIB"
export function formatSubmittedLabel(createdAt) {
  if (!createdAt) return '';
  return `${formatDateLabel(createdAt.slice(0, 10))}, ${createdAt.slice(11, 16)} WIB`;
}

const toSentLabel = (createdAt) => {
  const label = formatSubmittedLabel(createdAt);
  return label ? `Dikirim ${label}` : '';
};

// ---------------------------------------------------------------- LEMBUR
// `record` = hasil toDisplayOvertime() (services/overtimeService.js)
export function buildOvertimeCardModel(record, { isLatest = false } = {}) {
  const flowRequest = { ...record, ...resolveFlowState(record) };
  const statusMeta = getStatusMeta(flowRequest);

  return {
    tone: statusMeta.tone,
    eyebrow: isLatest ? 'Pengajuan Lembur Terbaru' : 'Pengajuan Lembur',
    title: formatDateLabel(record.date),
    sentLabel: toSentLabel(record.createdAt),
    badgeLabel: statusMeta.label,
    stats: [
      { label: 'Mulai', value: record.startTime },
      { label: 'Selesai', value: record.endTime },
      { label: 'Total', value: record.duration, emphasis: true },
    ],
    note: { label: 'Pekerjaan', text: record.reason },
    steps: buildTimeline(flowRequest).map(({ key, label, state }) => ({ key, label, state })),
    hint: statusMeta.hint,
    // Tombol Batalkan butuh endpoint backend; belum ada, jadi selalu false.
    cancellable: flowRequest.status === 'pending',
  };
}

// ------------------------------------------------------------------ CUTI
// [UBAH] Approver bekerja BERJENJANG sesuai backend (LeaveService.processApprovalAction):
// Leader -> SPV -> Manager. Hanya SATU langkah yang "current" (approver pertama yang belum
// ACC); langkah sesudahnya "upcoming" sampai giliran tiba. Cuti baru APPROVED setelah
// semuanya ACC, dan satu aksi tolak/kembalikan langsung mengakhiri proses.
const CUTI_ROLE_ORDER = ['LEADER', 'SPV', 'MANAGER'];
const CUTI_ROLE_LABEL = { LEADER: 'Leader', SPV: 'SPV', MANAGER: 'Manager' };
const CUTI_STEP_LABEL = { LEADER: 'Review Leader', SPV: 'Review SPV', MANAGER: 'ACC Manager' };
const CUTI_STEP_STATE_BY_ACTION = {
  APPROVED: 'done',
  REJECTED: 'rejected',
  RETURNED: 'returned',
};

const normalizeRole = (role) => String(role || '').trim().toUpperCase();
const joinNames = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} dan ${names[names.length - 1]}` : names[0] || '');

// Kode status keseluruhan dari label yang dipakai mapMyLeave().
const CUTI_OVERALL_BY_LABEL = {
  'Disetujui (ACC)': 'APPROVED',
  Ditolak: 'REJECTED',
  Dikembalikan: 'RETURNED',
  'Dalam Proses': 'PENDING',
};

// Daftar langkah approval: dari log approval kalau sudah dimuat, kalau belum
// (detail masih diambil) tebak dari peran pemohon.
function resolveCutiApprovals(detail, isSupervisorRequester) {
  const logs = Array.isArray(detail?.approvalLogs) ? detail.approvalLogs : [];
  if (logs.length > 0) {
    return CUTI_ROLE_ORDER
      .map((role) => {
        const log = logs.find((entry) => normalizeRole(entry.approverRole) === role);
        return log ? { role, action: normalizeRole(log.action), note: log.note || '' } : null;
      })
      .filter(Boolean);
  }
  const roles = isSupervisorRequester ? ['MANAGER'] : CUTI_ROLE_ORDER;
  return roles.map((role) => ({ role, action: 'PENDING', note: '' }));
}

// `item`   = hasil mapMyLeave() (services/CutiService.js)
// `detail` = respons mentah GET /api/cuti/{id}/detail (boleh null selagi dimuat)
export function buildLeaveCardModel(item, detail, { isLatest = false, isSupervisorRequester = false } = {}) {
  const overall = CUTI_OVERALL_BY_LABEL[item.status] || 'PENDING';
  const approvals = resolveCutiApprovals(detail, isSupervisorRequester);
  // [BARU] Approver yang sedang ditunggu = yang pertama belum ACC/aksi (urutan Leader -> SPV -> Manager)
  const currentRole = approvals.find((approval) => !CUTI_STEP_STATE_BY_ACTION[approval.action])?.role || null;

  const steps = [
    { key: 'submitted', label: 'Diajukan', state: 'done' },
    ...approvals.map(({ role, action }) => {
      let state = CUTI_STEP_STATE_BY_ACTION[action];
      // [UBAH] hanya approver pertama yang belum ACC yang "current"; sisanya "upcoming"
      if (!state) state = overall === 'PENDING' && role === currentRole ? 'current' : 'upcoming';
      if (overall === 'APPROVED') state = 'done';
      return { key: role.toLowerCase(), label: CUTI_STEP_LABEL[role], state };
    }),
  ];

  const pendingNames = currentRole ? [CUTI_ROLE_LABEL[currentRole]] : [];
  const actedBy = approvals.find((approval) => CUTI_STEP_STATE_BY_ACTION[approval.action] && approval.action !== 'APPROVED');
  const actedByLabel = actedBy ? CUTI_ROLE_LABEL[actedBy.role] : 'approver';
  const actedNote = actedBy?.note ? ` Catatan: ${actedBy.note}` : '';

  let tone = 'warning';
  // [UBAH] Label mengikuti alur: Menunggu Leader -> Menunggu SPV -> Menunggu Manager -> Disetujui
  let badgeLabel = pendingNames.length ? `Menunggu ${pendingNames[0]}` : 'Menunggu Approval';
  let hint = pendingNames.length ? `Menunggu review dari ${joinNames(pendingNames)}.` : 'Menunggu proses persetujuan.';

  if (overall === 'APPROVED') {
    tone = 'success';
    badgeLabel = 'Disetujui';
    hint = 'Pengajuan cuti telah disetujui oleh seluruh approver.';
  } else if (overall === 'REJECTED') {
    tone = 'danger';
    badgeLabel = 'Ditolak';
    hint = `Pengajuan ditolak oleh ${actedByLabel}.${actedNote}`;
  } else if (overall === 'RETURNED') {
    tone = 'info';
    badgeLabel = 'Dikembalikan';
    hint = `Dikembalikan oleh ${actedByLabel}.${actedNote} Klik Aksi untuk memperbaiki dan mengirim ulang.`;
  }

  const rawDetail = item.rawDetail || {};
  return {
    tone,
    eyebrow: isLatest ? 'Pengajuan Cuti Terbaru' : 'Pengajuan Cuti',
    title: item.jenisCuti,
    sentLabel: toSentLabel(item.submittedAt),
    badgeLabel,
    stats: [
      { label: 'Mulai', value: formatDateLabel(String(rawDetail.startDate || '').slice(0, 10)) },
      { label: 'Selesai', value: formatDateLabel(String(rawDetail.endDate || '').slice(0, 10)) },
      { label: 'Total', value: item.totalHari, emphasis: true },
    ],
    note: { label: 'Alasan', text: rawDetail.reason || '-' },
    steps,
    hint,
    cancellable: false,
  };
}

// ------------------------------------------------------------- IZIN SAKIT
// `record` = hasil toDisplayRecord() (services/attendanceService.js) dengan reasonCode SAKIT.
// Persetujuan sakit satu tahap (Leader/SPV/Manager divisi yang sama), lalu
// surat dokter yang boleh menyusul.
export function buildSickCardModel(record, { isLatest = false } = {}) {
  const approval = record.approvalStatus || 'PENDING';
  const hasLetter = Boolean(record.documentUrl);
  const letterMissing = record.documentRequired && !hasLetter;

  const reviewState = { PENDING: 'current', APPROVED: 'done', REJECTED: 'rejected' }[approval] || 'current';
  let letterState = 'upcoming';
  if (hasLetter) letterState = 'done';
  else if (approval === 'APPROVED' && letterMissing) letterState = 'current';

  let tone = 'warning';
  let badgeLabel = 'Menunggu Atasan';
  let hint = 'Menunggu review dari Leader/SPV/Manager divisi Anda.';
  if (approval === 'REJECTED') {
    tone = 'danger';
    badgeLabel = 'Ditolak';
    hint = 'Pengajuan izin sakit ditolak oleh atasan.';
  } else if (approval === 'APPROVED' && letterMissing) {
    badgeLabel = 'Susul Surat Dokter';
    hint = 'Pengajuan disetujui. Surat dokter tetap wajib: klik Aksi untuk mengunggah surat susulan.';
  } else if (approval === 'APPROVED') {
    tone = 'success';
    badgeLabel = 'Disetujui';
    hint = 'Pengajuan izin sakit telah disetujui.';
  } else if (letterMissing) {
    hint = 'Menunggu review atasan. Surat dokter masih perlu diunggah (boleh menyusul).';
  }

  // Urutan tampilan: Diajukan -> Surat Dokter -> Review Atasan (review di paling akhir).
  const steps = [{ key: 'submitted', label: 'Diajukan', state: 'done' }];
  if (record.documentRequired) steps.push({ key: 'letter', label: 'Surat Dokter', state: letterState });
  steps.push({ key: 'review', label: 'Review Atasan', state: reviewState });

  return {
    tone,
    eyebrow: isLatest ? 'Pengajuan Izin Sakit Terbaru' : 'Pengajuan Izin Sakit',
    title: formatDateLabel(record.attendanceDate),
    sentLabel: record.recordedAt ? `Dikirim ${formatDateLabel(record.attendanceDate)}, ${record.time}` : '',
    badgeLabel,
    stats: [
      { label: 'Tanggal', value: formatDateLabel(record.attendanceDate) },
      { label: 'Lama', value: `${record.leaveDays} Hari`, emphasis: true },
      { label: 'Surat', value: hasLetter ? 'Terlampir' : 'Belum ada' },
    ],
    note: { label: 'Keterangan', text: record.note || '-' },
    steps,
    hint,
    cancellable: false,
  };
}

// ------------------------------------------------------------ TUKAR SHIFT
// [BARU] `request` = { id, requesterName, receiverName, shiftLabel, reason, createdAt, status }
// status: 'PENDING_COLLEAGUE' (menunggu rekan) | 'PENDING_SUPERIOR' (rekan sudah setuju,
// menunggu ACC atasan) | 'REJECTED_COLLEAGUE' (ditolak rekan).
// Datanya masih lokal (belum ada backend) -- lihat pages/Pengajuan/hooks/useShiftSwapRequests.js.
export function buildShiftSwapCardModel(request, { isLatest = false } = {}) {
  let colleagueState = 'current';
  let superiorState = 'upcoming';
  let tone = 'warning';
  let badgeLabel = 'Menunggu Rekan';
  let hint = `Menunggu persetujuan ${request.receiverName} sebagai rekan pengganti.`;

  if (request.status === 'PENDING_SUPERIOR') {
    colleagueState = 'done';
    superiorState = 'current';
    badgeLabel = 'Menunggu ACC Atasan';
    hint = `${request.receiverName} sudah menyetujui. Menunggu ACC dari atasan.`;
  } else if (request.status === 'REJECTED_COLLEAGUE') {
    colleagueState = 'rejected';
    tone = 'danger';
    badgeLabel = 'Ditolak Rekan';
    hint = `${request.receiverName} menolak permintaan tukar shift ini.`;
  }

  return {
    tone,
    eyebrow: isLatest ? 'Pengajuan Tukar Shift Terbaru' : 'Pengajuan Tukar Shift',
    title: `${request.requesterName} \u2192 ${request.receiverName}`,
    sentLabel: toSentLabel(request.createdAt),
    badgeLabel,
    stats: [
      { label: 'Pemohon', value: request.requesterName },
      { label: 'Rekan Pengganti', value: request.receiverName, emphasis: true },
    ],
    note: { label: 'Jadwal', text: request.shiftLabel },
    steps: [
      { key: 'submitted', label: 'Diajukan', state: 'done' },
      { key: 'colleague', label: 'Persetujuan Rekan', state: colleagueState },
      { key: 'superior', label: 'ACC Atasan', state: superiorState },
    ],
    hint,
    cancellable: false,
  };
}
