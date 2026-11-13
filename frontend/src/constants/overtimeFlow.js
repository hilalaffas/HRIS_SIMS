// Approval flow for overtime requests: a single HRD stage (HRD_Admin / HRD_Karyawan).
// Change this array if the approval chain changes; the timeline adapts automatically.
export const approvalLevels = [
  { key: 'hrd', label: 'HRD', stepLabel: 'ACC HRD' },
];

// Old requests that are still pending keep their Leader -> Supervisor -> Manager chain.
export const legacyApprovalLevels = [
  { key: 'leader', label: 'Leader', stepLabel: 'Review Leader' },
  { key: 'supervisor', label: 'Supervisor', stepLabel: 'Review Supervisor' },
  { key: 'manager', label: 'Manager', stepLabel: 'ACC Manager' },
];

// request.status      : 'pending' | 'approved' | 'rejected' | 'cancelled'
// request.levelIndex  : index in request.levels (defaults to approvalLevels) where the
//                       request is waiting (pending), was rejected, or was cancelled.
// request.levels      : optional; resolveFlowState() sets it to legacyApprovalLevels for old requests.
export function getStatusMeta(request) {
  const levels = request.levels ?? approvalLevels;
  const level = levels[request.levelIndex] ?? levels[0];

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
    ...(request.levels ?? approvalLevels).map((level) => ({
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
// approvalLevelIndex belum dikirim backend; selama kosong, level aktif dianggap level pertama.
const flowStatusByCode = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

export function resolveFlowState(record) {
  const approvals = Array.isArray(record.approvals) ? record.approvals : [];
  // Pengajuan lama (ada tahap LEADER/SPV/MANAGER) memakai alur lamanya; pengajuan baru satu tahap HRD.
  const isLegacy = approvals.some((step) => step.role !== 'HRD');
  const levels = isLegacy ? legacyApprovalLevels : approvalLevels;
  const order = isLegacy ? ['LEADER', 'SPV', 'MANAGER'] : ['HRD'];
  const currentIndex = approvals.findIndex((step) => step.action === 'PENDING');
  const rejectedIndex = approvals.findIndex((step) => step.action === 'REJECTED');
  let levelIndex = currentIndex >= 0 ? order.indexOf(approvals[currentIndex].role) : 0;
  if (rejectedIndex >= 0) levelIndex = order.indexOf(approvals[rejectedIndex].role);
  if (levelIndex < 0) levelIndex = 0;
  const status = flowStatusByCode[record.statusCode] ?? 'pending';
  return { status, levelIndex, levels };
}
