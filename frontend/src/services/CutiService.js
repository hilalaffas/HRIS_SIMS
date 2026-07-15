import { api } from './api';

const statusLabel = (value) => ({ PENDING: 'Dalam Proses', APPROVED: 'Disetujui (ACC)', RETURNED: 'Dikembalikan', REJECTED: 'Ditolak' }[String(value || '').toUpperCase()] || value || 'Dalam Proses');
const statusCode = (value) => ({ PENDING: 'PROSES', APPROVED: 'DISETUJUI', RETURNED: 'DIKEMBALIKAN', REJECTED: 'DITOLAK' }[String(value || '').toUpperCase()] || 'PROSES');
const dateText = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export const getLeaveBalance = () => api.get('/api/cuti/balance/me');
export const getApprovers = (role) => api.get(`/api/karyawan/approvers?role=${role}`);
export const getLeaveTypes = () => api.get('/api/jenis-cuti');

export async function submitCuti(payload) {
  const body = {
    leaveType: { leaveTypeId: Number(payload.leaveTypeId) },
    startDate: payload.dariTanggal,
    endDate: payload.sampaiTanggal,
    reason: payload.alasan,
    pendingWork: payload.pekerjaanTertunda,
    coveredBy: payload.coverOleh,
    leaderEmployeeId: payload.leaderEmployeeId || null,
    spvEmployeeId: payload.spvEmployeeId || null,
    managerEmployeeId: payload.managerEmployeeId || null,
  };
  return api.post('/api/cuti', body);
}

export const resubmitCuti = (id, payload) => api.put(`/api/cuti/${id}/resubmit`, {
  leaveType: { leaveTypeId: Number(payload.leaveTypeId) },
  startDate: payload.dariTanggal,
  endDate: payload.sampaiTanggal,
  reason: payload.alasan,
  pendingWork: payload.pekerjaanTertunda,
  coveredBy: payload.coverOleh,
  leaderEmployeeId: payload.leaderEmployeeId || null,
  spvEmployeeId: payload.spvEmployeeId || null,
  managerEmployeeId: payload.managerEmployeeId || null,
});

export function mapMyLeave(item) {
  const status = item.status?.statusName || item.status || 'PENDING';
  return {
    id: item.leaveRequestId,
    userName: item.employee?.fullName,
    jenisCuti: item.leaveType?.name || 'Cuti',
    stringTanggal: `${dateText(item.startDate)} - ${dateText(item.endDate)}`,
    totalHari: `${item.totalDays || 0} Hari`,
    status: statusLabel(status),
    rawDetail: { jenisCuti: item.leaveType?.name, dariTanggal: item.startDate, sampaiTanggal: item.endDate, alasan: item.reason, pekerjaanTertunda: item.pendingWork, coverOleh: item.coveredBy, reviewNote: item.reviewNote },
  };
}

export async function getRiwayatByUser() { return (await api.get('/api/cuti/me')).map(mapMyLeave); }

export async function getTeamLeaveByYear(year) {
  const requests = await api.get(`/api/cuti/calendar?year=${year}`);
  const result = {};

  requests
    .filter((item) => ['PENDING', 'APPROVED'].includes(String(item.status?.statusName || item.status || '').toUpperCase()))
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

export function mapApproval(item) {
  const logs = item.approvalLogs || [];
  const chain = Object.fromEntries(['LEADER', 'SPV', 'MANAGER'].map(role => {
    const entry = logs.find(log => log.approverRole === role);
    return [role.toLowerCase(), entry ? `${entry.approverName || role} (${entry.action})` : 'None'];
  }));
  return {
    id: item.leaveRequestId,
    karyawan: { nama: item.employeeName, kode: `CUTI-${item.leaveRequestId}`, jabatan: '-' },
    jenisCuti: item.leaveType,
    durasi: `${dateText(item.startDate)} - ${dateText(item.endDate)} (${item.totalDays} Hari)`,
    keterangan: item.reason || '-', pekerjaanDicover: [item.pendingWork, item.coveredBy].filter(Boolean).join(' • '),
    statusBerkas: statusCode(item.overallStatus),
    approvalChain: chain,
    riwayatLog: logs.map(log => ({ nama: log.approverName || log.approverRole, waktu: log.actedAt ? new Date(log.actedAt).toLocaleString('id-ID') : '-', statusBadge: log.action, catatan: log.note || '-' })),
  };
}

export const getPendingApprovals = async () => (await api.get('/api/cuti/approvals/my-task')).map(mapApproval);
export const getApprovalHistory = async () => (await api.get('/api/cuti/approvals/history')).map(mapApproval);
export const takeApprovalAction = (id, action, note) => api.put(`/api/cuti/${id}/${action}`, { note });
