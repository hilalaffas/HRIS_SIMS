// src/utils/approvalProgress.js
//
// [BARU] Menyiapkan data tahap untuk <ApprovalProgressStepper> dari detail cuti
// (hasil mapApproval() di services/CutiService.js). Murni fungsi, tanpa efek samping.
//
// Contoh pemakaian:
// const steps = buildLeaveProgressSteps(detailData); // [{ key, label, name, caption, state }]
const ROLE_ORDER = ['LEADER', 'SPV', 'MANAGER'];
const ROLE_LABEL = { LEADER: 'Leader', SPV: 'SPV', MANAGER: 'Manager' };
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Status berkas (id/en) -> kode umum
const OVERALL_BY_KEY = {
  PROSES: 'PENDING', PENDING: 'PENDING', 'DALAM PROSES': 'PENDING',
  DISETUJUI: 'APPROVED', APPROVED: 'APPROVED',
  DITOLAK: 'REJECTED', REJECTED: 'REJECTED',
  DIKEMBALIKAN: 'RETURNED', RETURNED: 'RETURNED',
};

// "2026-10-24 09:05" -> "24 Okt, 09:05" (kembali ke teks asli bila formatnya tak dikenali)
export function formatActedAt(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2})/);
  if (!match) return value && value !== '-' ? String(value) : '';
  return `${Number(match[3])} ${MONTH_SHORT[Number(match[2]) - 1]}, ${match[4]}`;
}

const captionFor = (state, actedAt) => {
  const time = formatActedAt(actedAt);
  const withTime = (text) => (time ? `${text} \u00b7 ${time}` : text);
  if (state === 'done') return withTime('Disetujui');
  if (state === 'rejected') return withTime('Ditolak');
  if (state === 'returned') return withTime('Dikembalikan');
  if (state === 'current') return 'Sedang meninjau';
  return 'Menunggu giliran';
};

export function buildLeaveProgressSteps(detail) {
  if (!detail) return [];
  const overall = OVERALL_BY_KEY[String(detail.statusBerkas || detail.globalStatus || 'PROSES').toUpperCase()] || 'PENDING';
  const chain = detail.approvalChain || {};

  // Sumber utama: log per approver dari backend. Cadangan (data belum lengkap): nama dari alur approval.
  let source = Array.isArray(detail.approvalSteps) ? detail.approvalSteps : [];
  if (source.length === 0) {
    const assigned = ROLE_ORDER
      .map((role) => ({ role, name: chain[role.toLowerCase()], action: overall === 'APPROVED' ? 'APPROVED' : 'PENDING', actedAt: null }))
      .filter((step) => step.name && step.name !== '-');
    source = assigned.length > 0
      ? assigned
      : ROLE_ORDER.map((role) => ({ role, name: '', action: overall === 'APPROVED' ? 'APPROVED' : 'PENDING', actedAt: null }));
  }

  // Berkas ditolak/dikembalikan tetapi log belum memuatnya: tandai tahap pertama yang belum ACC.
  const hasStop = source.some((step) => step.action === 'REJECTED' || step.action === 'RETURNED');
  const stopAction = !hasStop && (overall === 'REJECTED' || overall === 'RETURNED') ? overall : null;
  let stopPlaced = false;
  let currentPlaced = false;

  return source.map((step) => {
    let action = step.action;
    if (stopAction && action === 'PENDING' && !stopPlaced) {
      action = stopAction;
      stopPlaced = true;
    }
    let state = 'upcoming';
    if (action === 'APPROVED') state = 'done';
    else if (action === 'REJECTED') state = 'rejected';
    else if (action === 'RETURNED') state = 'returned';
    else if (overall === 'PENDING' && !currentPlaced) {
      state = 'current'; // hanya approver pertama yang belum ACC yang sedang ditunggu
      currentPlaced = true;
    }
    return {
      key: step.role.toLowerCase(),
      label: ROLE_LABEL[step.role],
      name: step.name && step.name !== '-' ? step.name : '',
      caption: captionFor(state, step.actedAt),
      state,
    };
  });
}
