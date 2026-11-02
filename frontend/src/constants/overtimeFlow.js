// Approval hierarchy for overtime requests: Leader -> Supervisor -> Manager.
// Change this array if the approval chain changes; the timeline adapts automatically.
export const approvalLevels = [
  { key: 'leader', label: 'Leader', stepLabel: 'Review Leader' },
  { key: 'supervisor', label: 'Supervisor', stepLabel: 'Review Supervisor' },
  { key: 'manager', label: 'Manager', stepLabel: 'ACC Manager' },
];

// request.status      : 'pending' | 'approved' | 'rejected' | 'cancelled'
// request.levelIndex  : index in approvalLevels where the request is
//                       waiting (pending), was rejected, or was cancelled.
export function getStatusMeta(request) {
  const level = approvalLevels[request.levelIndex] ?? approvalLevels[0];

  switch (request.status) {
    case 'approved':
      return {
        label: 'Disetujui',
        tone: 'success',
        hint: 'Pengajuan telah disetujui oleh seluruh level approval.',
      };
    case 'rejected':
      return {
        label: 'Ditolak',
        tone: 'danger',
        hint: `Pengajuan ditolak oleh ${level.label}.`,
      };
    case 'cancelled':
      return {
        label: 'Dibatalkan',
        tone: 'muted',
        hint: 'Pengajuan dibatalkan oleh pemohon.',
      };
    default:
      return {
        label: `Menunggu ${level.label}`,
        tone: 'warning',
        hint: `Menunggu review dari ${level.label}.`,
      };
  }
}

// Returns 4 steps: Diajukan + one step per approval level.
// state: 'done' | 'current' | 'rejected' | 'cancelled' | 'upcoming'
export function buildTimeline(request) {
  const steps = [
    { key: 'submitted', label: 'Diajukan' },
    ...approvalLevels.map((level) => ({
      key: level.key,
      label: level.stepLabel,
    })),
  ];

  return steps.map((step, index) => {
    let state = 'upcoming';

    if (request.status === 'approved' || index <= request.levelIndex) {
      state = 'done';
    } else if (index === request.levelIndex + 1) {
      state = request.status === 'pending' ? 'current' : request.status;
    }

    return { ...step, index, state };
  });
}

// [BARU] Menerjemahkan data dari overtimeService (statusCode huruf besar)
// ke bentuk { status, levelIndex } yang dipakai getStatusMeta/buildTimeline.
// approvalLevelIndex (0 Leader, 1 SPV, 2 Manager) belum dikirim backend;
// selama kosong, level aktif dianggap Leader.
const flowStatusByCode = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

export function resolveFlowState(record) {
  const approvals = Array.isArray(record.approvals) ? record.approvals : [];
  const order = ['LEADER', 'SPV', 'MANAGER'];
  const currentIndex = approvals.findIndex((step) => step.action === 'PENDING');
  const rejectedIndex = approvals.findIndex((step) => step.action === 'REJECTED');
  let levelIndex = currentIndex >= 0 ? order.indexOf(approvals[currentIndex].role) : 0;
  if (rejectedIndex >= 0) levelIndex = order.indexOf(approvals[rejectedIndex].role);
  if (levelIndex < 0) levelIndex = 0;
  const status = flowStatusByCode[record.statusCode] ?? 'pending';
  return { status, levelIndex };
}
