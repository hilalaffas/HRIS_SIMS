// src/services/cutiService.js
// ====================================================================
// PENTING — BAGIAN YANG WAJIB DICEK & DISESUAIKAN DENGAN BACKEND ANDA:
//   1. Semua path endpoint (dicari dengan menandai komentar "ENDPOINT:").
//   2. Bentuk field respons approvers (lihat mapApprover()).
//   3. Nama "action" untuk approve/return/reject (lihat ACTION_MAP).
//   4. Endpoint detail single leave request (getDetailCutiById) — backend
//      Anda mungkin memakai path yang berbeda dari yang saya asumsikan.
// Semua asumsi ini ditandai dengan komentar "ASUMSI:" di dekat kodenya.
// ====================================================================

import { api } from './api';

// --------------------------------------------------------------------------
// Helper normalisasi status & tanggal (dipakai untuk mapping respons backend)
// --------------------------------------------------------------------------

const statusLabel = (value) =>
  ({
    PENDING: 'Dalam Proses',
    APPROVED: 'Disetujui (ACC)',
    RETURNED: 'Dikembalikan',
    REJECTED: 'Ditolak',
  }[String(value || '').toUpperCase()] || value || 'Dalam Proses');

const statusKeySimple = (value) =>
  ({
    PENDING: 'Proses',
    APPROVED: 'Disetujui',
    RETURNED: 'Dikembalikan',
    REJECTED: 'Ditolak',
  }[String(value || '').toUpperCase()] || 'Proses');

const dateText = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
    : '';

const dateTextWithYear = (startValue, endValue) => {
  if (!startValue || !endValue) return '';
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  const year = end.getFullYear();
  return `${dateText(startValue)} - ${dateText(endValue)} ${year}`;
};

// ASUMSI: action yang diterima endpoint approval backend Anda. Sesuaikan
// jika backend memakai kata lain, mis. "acc" / "kembalikan" / "tolak".
const ACTION_MAP = {
  Approved: 'approve',
  Returned: 'return',
  Rejected: 'reject',
};

// Ubah satu baris log approval dari backend (approvalLogs[]) menjadi bentuk
// { nama, status, catatan } yang dipakai LeaveDetailModal untuk leader/spv/manager.
const mapApprovalEntry = (logs, role) => {
  const entry = (logs || []).find((log) => String(log.approverRole).toUpperCase() === role);
  if (!entry) return null;
  return {
    nama: entry.approverName || role,
    status: entry.action === 'APPROVE' ? 'Approved' : entry.action === 'RETURN' ? 'Returned' : entry.action === 'REJECT' ? 'Rejected' : 'Pending',
    catatan: entry.note || '',
  };
};

const dateTextFull = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

// Disalin persis dari CutiService (1).js — dipakai oleh getApprovalHistory()
// di bagian bawah file untuk menyusun tampilan riwayat approval atasan.
function mapApproval(item) {
  const logs = item.approvalLogs || [];
  const chain = Object.fromEntries(['LEADER', 'SPV', 'MANAGER'].map(role => {
    const entry = logs.find(log => log.approverRole === role);
    return [role.toLowerCase(), entry ? `${entry.approverName || role} (${entry.action})` : 'None'];
  }));
  return {
    id: item.leaveRequestId,
    karyawan: { nama: item.employeeName, kode: `CUTI-${item.leaveRequestId}`, jabatan: '-' },
    jenisCuti: item.leaveType,
    durasi: `${dateTextFull(item.startDate)} - ${dateTextFull(item.endDate)} (${item.totalDays} Hari)`,
    keterangan: item.reason || '-',
    pekerjaanDicover: [item.pendingWork, item.coveredBy].filter(Boolean).join(' • '),
    statusBerkas: statusKeySimple(item.overallStatus).toUpperCase(),
    approvalChain: chain,
    riwayatLog: logs.map(log => ({
      nama: log.approverName || log.approverRole,
      waktu: log.actedAt ? new Date(log.actedAt).toLocaleString('id-ID') : '-',
      statusBadge: log.action,
      catatan: log.note || '-',
    })),
  };
}

// --------------------------------------------------------------------------
// Kirim/Edit pengajuan cuti baru
// --------------------------------------------------------------------------

/**
 * ENDPOINT: POST /api/cuti (baru) atau PUT /api/cuti/:id/resubmit (edit)
 * Menerima payload dengan nama field seperti yang dikirim ApplyCuti.jsx:
 *   { id?, userId, userName, leaveTypeId, leaveType, dariTanggal, sampaiTanggal,
 *     reason, pendingWork, coveredBy, leaderEmployeeId, spvEmployeeId,
 *     managerEmployeeId, autoApproved? }
 * `autoApproved` dikirim true khusus saat role Manager memilih "None" di
 * ketiga level approval (lihat ApplyCuti.jsx: handleSubmit).
 */
export async function submitCuti(payload) {
  // PERBAIKAN: saat approver dipilih "None" di dropdown, nilainya adalah
  // string literal "None" (bukan kosong) — kalau langsung dikirim sebagai
  // ID, backend akan menerima string "None" alih-alih null. Konversi dulu.
  const normalizeApproverId = (value) => (value && value !== 'None' ? value : null);

  const body = {
    leaveType: { leaveTypeId: Number(payload.leaveTypeId) },
    startDate: payload.dariTanggal,
    endDate: payload.sampaiTanggal,
    reason: payload.reason,
    pendingWork: payload.pendingWork,
    coveredBy: payload.coveredBy,
    leaderEmployeeId: normalizeApproverId(payload.leaderEmployeeId),
    spvEmployeeId: normalizeApproverId(payload.spvEmployeeId),
    managerEmployeeId: normalizeApproverId(payload.managerEmployeeId),
    // ASUMSI: backend Anda mengenali flag ini untuk menandai pengajuan yang
    // sengaja tidak melalui approval berjenjang (khusus role Manager yang
    // memilih "None" di ketiga level approval). Sesuaikan nama field ini
    // (atau logikanya) dengan kontrak backend Anda yang sebenarnya — kalau
    // backend belum mendukung auto-approve, field ini akan diabaikan begitu
    // saja oleh server tanpa error, tapi status pengajuan tetap "Pending"
    // sampai backend menambahkan dukungannya.
    autoApproved: Boolean(payload.autoApproved),
  };

  const response = payload.id
    ? await api.put(`/api/cuti/${payload.id}/resubmit`, body)
    : await api.post('/api/cuti', body);

  // Kembalikan bentuk minimal yang konsisten, seandainya pemanggil membaca hasilnya
  return {
    id: response?.leaveRequestId ?? payload.id,
    ...payload,
  };
}

// --------------------------------------------------------------------------
// Riwayat pengajuan cuti milik satu user
// --------------------------------------------------------------------------

/**
 * ENDPOINT: GET /api/cuti/me
 * ASUMSI: backend mengenali user dari token (Authorization header), jadi
 * parameter userId di sini TIDAK dikirim ke backend — hanya dipertahankan
 * agar signature fungsi tetap sama dengan versi dummy.
 */
export async function getRiwayatByUser(userId) {
  const items = await api.get('/api/cuti/me');

  return (items || []).map((item) => {
    const status = item.status?.statusName || item.status || 'PENDING';
    const logs = item.approvalLogs || [];

    return {
      id: item.leaveRequestId,
      userId: item.employee?.employeeId ?? userId,
      userName: item.employee?.fullName,
      leaveType: item.leaveType?.name || 'Cuti',
      stringTanggal: dateTextWithYear(item.startDate, item.endDate),
      totalHari: `${item.totalDays || 0} Hari`,
      status: statusLabel(status),
      isUnread: Boolean(item.isUnread), // ASUMSI: backend punya flag ini; jika tidak ada, selalu false
      rawDetail: {
        leaveTypeId: item.leaveType?.leaveTypeId,
        leaveType: item.leaveType?.name,
        dariTanggal: item.startDate,
        sampaiTanggal: item.endDate,
        totalHari: `${item.totalDays || 0} Hari`,
        reason: item.reason,
        pendingWork: item.pendingWork,
        coveredBy: item.coveredBy,
        leaderEmployeeId: item.leaderEmployeeId,
        spvEmployeeId: item.spvEmployeeId,
        managerEmployeeId: item.managerEmployeeId,
        leader: mapApprovalEntry(logs, 'LEADER'),
        spv: mapApprovalEntry(logs, 'SPV'),
        manager: mapApprovalEntry(logs, 'MANAGER'),
      },
    };
  });
}

// --------------------------------------------------------------------------
// Detail satu pengajuan cuti (dipakai LeaveDetailModal)
// --------------------------------------------------------------------------

/**
 * ENDPOINT: GET /api/cuti/:id
 * Dikonfirmasi tersedia di backend — mengembalikan satu objek leave request
 * dengan bentuk yang sama seperti item di dalam GET /api/cuti/me (employee,
 * leaveType, startDate, endDate, reason, pendingWork, coveredBy, approvalLogs).
 */
export async function getDetailCutiById(id) {
  const item = await api.get(`/api/cuti/${id}`);
  if (!item) return null;

  const status = item.status?.statusName || item.status || 'PENDING';
  const logs = item.approvalLogs || [];

  return {
    id: item.leaveRequestId,
    pemohon: item.employee?.fullName || 'Karyawan',
    leaveTypeId: item.leaveType?.leaveTypeId,
    leaveType: item.leaveType?.name,
    globalStatus: statusKeySimple(status).toUpperCase(),
    stringTanggal: dateTextWithYear(item.startDate, item.endDate),
    dariTanggal: item.startDate,
    sampaiTanggal: item.endDate,
    reason: item.reason,
    pendingWork: item.pendingWork,
    coveredBy: item.coveredBy,
    leader: mapApprovalEntry(logs, 'LEADER'),
    spv: mapApprovalEntry(logs, 'SPV'),
    manager: mapApprovalEntry(logs, 'MANAGER'),
    logPemeriksaan: [
      {
        nama: item.employee?.fullName || 'Karyawan',
        tanggal: dateTextWithYear(item.startDate, item.endDate),
        aksi: 'DIAJUKAN',
        catatan: 'Mengajukan awal',
      },
      ...logs.map((log) => ({
        nama: `${log.approverName || log.approverRole} (${log.approverRole})`,
        tanggal: log.actedAt ? new Date(log.actedAt).toLocaleDateString('id-ID') : '-',
        aksi: log.action,
        catatan: log.note || '-',
      })),
    ],
  };
}

// --------------------------------------------------------------------------
// Approve / Return / Reject oleh atasan (dipanggil dari LeaveDetailModal)
// --------------------------------------------------------------------------

/**
 * ENDPOINT: PUT /api/cuti/:id/:action  (action: approve | return | reject)
 * Menerima payload lama: { cutiId, roleAtasan, status, catatan }
 */
export async function updateStatusCuti(payload) {
  const { cutiId, status, catatan } = payload;
  const action = ACTION_MAP[status] || 'approve';

  const response = await api.put(`/api/cuti/${cutiId}/${action}`, { note: catatan });
  return response;
}

// --------------------------------------------------------------------------
// Kalender tim (dipakai untuk pewarnaan hari cuti pada kalender, jika ada)
// --------------------------------------------------------------------------

/**
 * ENDPOINT: GET /api/cuti/calendar?year=YYYY
 */
export async function getTeamLeaveByYear(year) {
  const requests = await api.get(`/api/cuti/calendar?year=${year}`);
  const result = {};

  (requests || [])
    .filter((item) =>
      ['PENDING', 'APPROVED'].includes(String(item.status?.statusName || item.status || '').toUpperCase())
    )
    .forEach((item) => {
      const start = new Date(`${item.startDate}T00:00:00`);
      const end = new Date(`${item.endDate}T00:00:00`);
      for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        if (date.getFullYear() !== Number(year)) continue;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        (result[key] ??= []).push({
          nama: item.employee?.fullName || 'Karyawan',
          jenisCuti: item.leaveType?.name || 'Cuti',
          status: statusLabel(item.status?.statusName || item.status),
        });
      }
    });

  return result;
}

// --------------------------------------------------------------------------
// Daftar karyawan untuk dropdown approval (Leader / SPV / Manager)
// --------------------------------------------------------------------------

/**
 * ENDPOINT: GET /api/karyawan/approvers?role=leader|spv|manager
 * ASUMSI: setiap item respons punya salah satu dari (employeeId | id) dan
 * salah satu dari (fullName | nama | name). mapApprover() menangani variasi
 * ini secara defensif — sesuaikan/pangkas jika bentuk field backend sudah pasti.
 */
function mapApprover(raw) {
  return {
    employeeId: raw.employeeId ?? raw.id,
    fullName: raw.fullName ?? raw.nama ?? raw.name,
  };
}

export async function getEmployeesByRole(role) {
  const list = await api.get(`/api/karyawan/approvers?role=${role}`);
  return (list || []).map(mapApprover);
}

export async function getAllApprovalOptions() {
  const [leaderOptions, spvOptions, managerOptions] = await Promise.all([
    getEmployeesByRole('leader'),
    getEmployeesByRole('spv'),
    getEmployeesByRole('manager'),
  ]);
  return { leaderOptions, spvOptions, managerOptions };
}

// --------------------------------------------------------------------------
// Fungsi tambahan dari CutiService (1).js — diselaraskan endpoint & nama
// field-nya persis sama, walau BELUM dipanggil oleh 8 komponen React yang
// ada saat ini. Tersedia untuk dipakai kalau nanti dibutuhkan (mis. mengganti
// JENIS_CUTI_OPTIONS hardcode di ApplyCuti.jsx dengan data asli dari
// getLeaveTypes(), atau menampilkan sisaCutiTahunan dari getLeaveBalance()).
// --------------------------------------------------------------------------

/**
 * ENDPOINT: GET /api/cuti/balance/me
 */
export const getLeaveBalance = () => api.get('/api/cuti/balance/me');

/**
 * ENDPOINT: GET /api/jenis-cuti
 */
export const getLeaveTypes = () => api.get('/api/jenis-cuti');

/**
 * ENDPOINT: GET /api/cuti/approvals/history
 * Bentuk return mengikuti pola mapApproval() di file asli (bukan bentuk
 * getRiwayatByUser/getDetailCutiById), karena memang ditujukan untuk
 * halaman riwayat approval atasan, bukan untuk LeaveDetailModal.jsx.
 */
export async function getApprovalHistory() {
  const items = await api.get('/api/cuti/approvals/history');
  return (items || []).map(mapApproval);
}

/**
 * ENDPOINT: PUT /api/cuti/:id/:action
 * Alias langsung ke endpoint yang sama dipakai updateStatusCuti(), untuk
 * pemanggil yang lebih suka signature (id, action, note) seperti file asli.
 */
export const takeApprovalAction = (id, action, note) => api.put(`/api/cuti/${id}/${action}`, { note });



/**
 * ENDPOINT: GET /api/cuti/approvals/my-task
 */
export async function getPendingApprovals() {
  const items = await api.get('/api/cuti/approvals/my-task');

  return (items || []).map((item) => ({
    id: item.leaveRequestId,
    userName: item.employeeName,
    leaveType: item.leaveType,
    dariTanggal: item.startDate,
    sampaiTanggal: item.endDate,
    status: statusKeySimple(item.overallStatus),
    createdAt: item.startDate,
  }));
}