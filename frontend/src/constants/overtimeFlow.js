import { getUserRole, isHrd, ROLES } from '../utils/roles';

// Approval stages for overtime requests (same tiers as the leave workflow and the
// backend ApprovalChainPolicy). The chain depends on the REQUESTER's position:
//   HRD -> HRD | Member -> Leader, SPV, Manager | Leader -> SPV, Manager
//   SPV -> Manager | Manager -> another Manager
// Keep this table in sync with ApprovalChainPolicy.requiredStages() in the backend.
export const STAGE_META = {
  LEADER: { key: 'leader', label: 'Leader', stepLabel: 'Review Leader' },
  SPV: { key: 'spv', label: 'SPV', stepLabel: 'Review SPV' },
  MANAGER: { key: 'manager', label: 'Manager', stepLabel: 'ACC Manager' },
  HRD: { key: 'hrd', label: 'HRD', stepLabel: 'ACC HRD' },
};

const STAGE_ORDER = ['LEADER', 'SPV', 'MANAGER', 'HRD'];

// [BARU] Nilai dropdown untuk pilihan "-" (tahap dilewati). Bukan id karyawan: tidak pernah dikirim ke backend,
// diubah jadi null oleh buildApproverPayload / payload Cuti. Backend (ApproverScopePolicy) melewati tahap tanpa pilihan.
export const NO_APPROVER_VALUE = 'NONE';

// [BARU] Tahap yang boleh dikosongkan lewat "-". MANAGER dan HRD selalu wajib.
// Sinkron dengan ApproverScopePolicy.isOptionalStage() di backend.
export const OPTIONAL_STAGES = ['LEADER', 'SPV'];

// Payload field name used by the backend (OvertimeSubmitRequest) for each stage.
export const STAGE_FIELD = {
  LEADER: 'leaderEmployeeId',
  SPV: 'spvEmployeeId',
  MANAGER: 'managerEmployeeId',
  HRD: 'hrdEmployeeId',
};

// Stages the given user must pass when submitting an overtime request.
export function getRequiredStages(user) {
  if (isHrd(user)) return ['HRD'];
  switch (getUserRole(user)) {
    case ROLES.LEADER: return ['SPV', 'MANAGER'];
    case ROLES.SPV: return ['MANAGER'];
    case ROLES.MANAGER: return ['MANAGER'];
    default: return ['LEADER', 'SPV', 'MANAGER'];
  }
}

// ['LEADER', 'SPV', 'MANAGER'] -> "Leader → SPV → Manager"
export const describeStages = (stages) => stages.map((stage) => STAGE_META[stage]?.label || stage).join(' → ');

// Fallback level for a request that has no approver yet (name not completed).
const pendingNamingLevel = { key: 'approval', label: 'Approver', stepLabel: 'Menunggu Approver' };

// request.status      : 'pending' | 'approved' | 'rejected' | 'cancelled'
// request.levelIndex  : index in request.levels where the
//                       request is waiting (pending), was rejected, or was cancelled.
// request.levels      : set by resolveFlowState() from the request's own approval steps.
export function getStatusMeta(request) {
  const levels = request.levels ?? [pendingNamingLevel];
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

// Returns Diajukan + one step per approval level.
// state: 'done' | 'current' | 'rejected' | 'cancelled' | 'upcoming'
export function buildTimeline(request) {
  const steps = [
    { key: 'submitted', label: 'Diajukan' },
    ...(request.levels ?? [pendingNamingLevel]).map((level) => ({
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
  // [UBAH] Level diambil dari tahap approval milik pengajuan itu sendiri (berjenjang sesuai jabatan
  // pemohon), diurutkan Leader -> SPV -> Manager -> HRD. Tidak ada lagi alur "lama" vs "baru".
  const approvals = (Array.isArray(record.approvals) ? record.approvals : [])
    .slice()
    .sort((a, b) => STAGE_ORDER.indexOf(a.role) - STAGE_ORDER.indexOf(b.role));
  const levels = approvals.length > 0
    ? approvals.map((step) => STAGE_META[step.role] || { key: String(step.role).toLowerCase(), label: step.role, stepLabel: step.role })
    : [pendingNamingLevel];
  const currentIndex = approvals.findIndex((step) => step.action === 'PENDING');
  const rejectedIndex = approvals.findIndex((step) => step.action === 'REJECTED');
  let levelIndex = currentIndex >= 0 ? currentIndex : 0;
  if (rejectedIndex >= 0) levelIndex = rejectedIndex;
  const status = flowStatusByCode[record.statusCode] ?? 'pending';
  return { status, levelIndex, levels };
}

// [BARU] Teks popup ActionReasonModal saat approver MENOLAK lembur (alasan wajib diisi).
// Cuti memakai teks bawaan modal; lembur menimpanya lewat request.copy.
export const OVERTIME_REJECT_COPY = {
  modalTitle: 'Tolak Pengajuan Lembur',
  modalSubtitle: 'Berikan alasan penolakan yang jelas untuk pemohon.',
  placeholder: 'Contoh: Pekerjaan bisa diselesaikan di jam kerja, mohon ajukan ulang bila memang mendesak.',
  helperText: 'Alasan penolakan wajib diisi dan akan tercatat di riwayat log yang dilihat pemohon.',
};
