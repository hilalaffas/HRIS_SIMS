import { api } from './api';

const statusLabel = (value) => ({ 
  PENDING: 'Dalam Proses', APPROVED: 'Disetujui (ACC)', RETURNED: 'Dikembalikan', REJECTED: 'Ditolak' 
}[String(value || '').toUpperCase()] || value || 'Dalam Proses');

const statusCode = (value) => ({ 
  PENDING: 'PROSES', APPROVED: 'DISETUJUI', RETURNED: 'DIKEMBALIKAN', REJECTED: 'DITOLAK' 
}[String(value || '').toUpperCase()] || 'PROSES');

const dateText = (value) => {
  if (!value) return '-';
  const cleanDate = String(value).split('T')[0];
  const parsed = new Date(`${cleanDate}T00:00:00`);
  return isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const logDateText = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(parsed).replace(',', '');
};

const logStatusLabel = (value) => ({
  PENDING: 'DIAJUKAN', APPROVED: 'DISETUJUI (ACC)', RETURNED: 'DIKEMBALIKAN (RETURN)', REJECTED: 'DITOLAK',
}[String(value || '').toUpperCase()] || value || '-');

const normalizedLeaveDays = (item) => {
  const leaveTypeName = item?.leaveType?.name || item?.leaveType || item?.jenisCuti || '';
  return String(leaveTypeName).trim().toLowerCase() === 'cuti setengah hari'
    ? 0.5
    : Number(item?.totalDays || 0);
};

// [BARU] Label sesi Cuti setengah hari. Kode "PAGI"/"SIANG" dikirim &
// diterima dari backend (kolom leave_requests.session); label lengkap ini
// yang ditampilkan ke user.
export const SESSION_LABELS = {
  PAGI: 'Sesi Pagi (08.00 - 12.00)',
  SIANG: 'Sesi Siang (13.00 - 17.00)',
};

// [BARU] Label sesi untuk satu record, dipakai popup detail & dropdown edit.
export const sessionLabel = (sessionCode) => SESSION_LABELS[String(sessionCode || '').trim().toUpperCase()] || '';

// [BARU] Suffix " • Sesi Pagi (...)" yang disisipkan ke teks durasi
// ("totalHari"/"durasi") supaya sesi otomatis tampil di mana pun durasi
// itu dirender -- popup Detail Cuti (Form.jsx), Riwayat & Status Cuti
// (LeaveHistory.jsx), dan daftar/detail approval (ListSection.jsx) --
// tanpa perlu mengubah komponen tampilan satu per satu.
const sessionSuffix = (item) => {
  const label = sessionLabel(item?.session);
  return label ? ` • ${label}` : '';
};

// [UBAH] Diekspor (sebelumnya private) supaya bisa dipakai ulang di
// ApproveSection.jsx & ListSection.jsx untuk format angka "Sisa Cuti"
// per-karyawan pemohon, yang sekarang bisa berupa desimal (mis. 1,5 hari)
// sejak manual_leave_balance & remainingAnnualLeave mendukung BigDecimal.
export const dayText = (value) => Number(value).toLocaleString('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const getLeaveBalance = () => api.get('/api/cuti/balance/me');

// [BARU] Dipakai ModalDetailKaryawan.jsx (HR) untuk melihat sisa cuti
// tahunan karyawan lain -- bukan dirinya sendiri.
export const getLeaveBalanceByEmployeeId = (employeeId) => api.get(`/api/cuti/balance/${employeeId}`);

// [BARU] Total sisa cuti (Tahunan + Lama) SEMUA karyawan sekaligus,
// dipakai TableKaryawan.jsx lewat Karyawan.jsx (fetchKaryawan).
export const getAllLeaveBalances = () => api.get('/api/cuti/balance/all');

// [UBAH] Tambah employeeId opsional -- dipakai form Cuti Susulan (HR pilih
// approver ATAS NAMA karyawan lain, bukan dirinya sendiri). Pemanggilan lama
// tanpa employeeId (mis. Ajukan Cuti normal) tetap jalan persis seperti sebelumnya,
// karena query hanya menambahkan &employeeId=... kalau parameter itu diisi.
export const getApprovers = (role, employeeId) => {
  const query = employeeId ? `role=${role}&employeeId=${employeeId}` : `role=${role}`;
  return api.get(`/api/karyawan/approvers?${query}`);
};

export const getLeaveTypes = () => api.get('/api/jenis-cuti');

export async function submitCuti(payload) {
  const body = {
    leaveType: { leaveTypeId: Number(payload.leaveTypeId) },
    startDate: payload.startDate || payload.dariTanggal,
    endDate: payload.endDate || payload.sampaiTanggal,
    reason: payload.reason || payload.alasan,
    pendingWork: payload.pendingWork || payload.pekerjaanTertunda,
    coveredBy: payload.coveredBy || payload.coverOleh,
    // [BARU] Sesi Cuti setengah hari ("PAGI"/"SIANG"). Backend yang
    // memvalidasi & mengabaikan nilai ini untuk jenis cuti selain
    // setengah hari.
    session: payload.session || null,
    leaderEmployeeId: payload.leaderEmployeeId ? Number(payload.leaderEmployeeId) : null,
    spvEmployeeId: payload.spvEmployeeId ? Number(payload.spvEmployeeId) : null,
    managerEmployeeId: payload.managerEmployeeId ? Number(payload.managerEmployeeId) : null,
  };
  return api.post('/api/cuti', body);
}

// [BARU MERGED] Cuti Susulan/Darurat oleh HR Admin/Super Admin
export async function submitUrgentCuti(payload) {
  const body = {
    employee: { employeeId: Number(payload.karyawanId) },
    leaveType: { leaveTypeId: Number(payload.leaveTypeId) },
    startDate: payload.startDate,
    endDate: payload.endDate,
    reason: payload.alasan || payload.reason,
    pendingWork: payload.pekerjaanTertunda || payload.pendingWork,
    coveredBy: payload.dicoverOleh || payload.coveredBy,
    // [BARU] Sesi Cuti setengah hari, sama seperti submitCuti().
    session: payload.session || null,
    leaderEmployeeId: payload.leaderEmployeeId ? Number(payload.leaderEmployeeId) : null,
    spvEmployeeId: payload.spvEmployeeId ? Number(payload.spvEmployeeId) : null,
    managerEmployeeId: payload.managerEmployeeId ? Number(payload.managerEmployeeId) : null,
  };
  return api.post('/api/cuti/urgent', body);
}

export const resubmitCuti = (id, payload) => api.put(`/api/cuti/${id}/resubmit`, {
  leaveType: { leaveTypeId: Number(payload.leaveTypeId) },
  startDate: payload.startDate || payload.dariTanggal,
  endDate: payload.endDate || payload.sampaiTanggal,
  reason: payload.reason || payload.alasan,
  pendingWork: payload.pendingWork || payload.pekerjaanTertunda,
  coveredBy: payload.coveredBy || payload.coverOleh,
  // [BARU] Sesi Cuti setengah hari, sama seperti submitCuti().
  session: payload.session || null,
  leaderEmployeeId: payload.leaderEmployeeId ? Number(payload.leaderEmployeeId) : null,
  spvEmployeeId: payload.spvEmployeeId ? Number(payload.spvEmployeeId) : null,
  managerEmployeeId: payload.managerEmployeeId ? Number(payload.managerEmployeeId) : null,
});

export function mapMyLeave(item) {
  if (!item) return {};
  const status = item.status?.statusName || item.status || 'PENDING';
  const rawTanggal = `${dateText(item.startDate)} - ${dateText(item.endDate)}`;
  const totalDays = normalizedLeaveDays(item);
  return {
    id: item.leaveRequestId || item.id,
    userName: item.employee?.fullName || item.employeeName,
    jenisCuti: item.leaveType?.name || 'Cuti',
    stringTanggal: rawTanggal.split('(')[0].trim(),
    // [UBAH] Sesi Pagi/Siang disisipkan di sini supaya otomatis tampil di
    // Riwayat & Status Cuti (LeaveHistory.jsx) dan popup Detail Cuti.
    totalHari: `${dayText(totalDays)} Hari${sessionSuffix(item)}`,
    totalDays,
    reportedTotalDays: Number(item.totalDays || 0),
    // [BARU] Kode sesi mentah ("PAGI"/"SIANG"/null), dipakai handleEditKembali
    // di ApplyCuti.jsx untuk mengisi ulang dropdown sesi saat cuti diedit.
    session: item.session ?? null,
    status: statusLabel(status),
    statusChangedAt: item.returnedAt || item.approvedAt || item.submittedAt || null,
    rawDetail: { 
      jenisCuti: item.leaveType?.name, 
      startDate: item.startDate, 
      endDate: item.endDate, 
      reason: item.reason, 
      pendingWork: item.pendingWork, 
      coveredBy: item.coveredBy, 
      reviewNote: item.reviewNote,
      // [BARU] Dibaca ulang oleh handleEditKembali (ApplyCuti.jsx).
      session: item.session ?? null,
    },
  };
}

export async function getRiwayatByUser() { 
  const res = await api.get('/api/cuti/me');
  return Array.isArray(res) ? res.map(mapMyLeave) : []; 
}

export const getMyLeaveDetail = (id) => api.get(`/api/cuti/${id}/detail`);

export async function getTeamLeaveByYear(year) {
  const requests = await api.get(`/api/cuti/calendar?year=${year}`);
  const result = {};

  if (!Array.isArray(requests)) return result;

  requests
    .filter((item) => item?.startDate && item?.endDate && ['PENDING', 'APPROVED'].includes(String(item.status?.statusName || item.status || '').toUpperCase()))
    .forEach((item) => {
      const cleanStart = String(item.startDate).split('T')[0];
      const cleanEnd = String(item.endDate).split('T')[0];
      const start = new Date(`${cleanStart}T00:00:00`);
      const end = new Date(`${cleanEnd}T00:00:00`);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
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

export function mapApproval(item, employeeLookup = {}) {
  if (!item) return {};
  const logs = Array.isArray(item.approvalLogs) ? item.approvalLogs : [];
  const totalDays = normalizedLeaveDays(item);

  const leaderAssigned = item.leader?.fullName || item.leader?.nama || item.leaderEmployee?.fullName || item.leaderName;
  const spvAssigned = item.spv?.fullName || item.spv?.nama || item.spvEmployee?.fullName || item.spvName;
  const managerAssigned = item.manager?.fullName || item.manager?.nama || item.managerEmployee?.fullName || item.managerName;

  const leaderById = employeeLookup[item.leaderEmployeeId] || employeeLookup[item.leaderId];
  const spvById = employeeLookup[item.spvEmployeeId] || employeeLookup[item.spvId];
  const managerById = employeeLookup[item.managerEmployeeId] || employeeLookup[item.managerId];

  const getApproverFromLog = (role) => logs.find(log => String(log.approverRole).toUpperCase() === role)?.approverName;

  const chain = {
    leader: getApproverFromLog('LEADER') || leaderAssigned || leaderById || '-',
    spv: getApproverFromLog('SPV') || spvAssigned || spvById || '-',
    manager: getApproverFromLog('MANAGER') || managerAssigned || managerById || '-',
  };

  const submissionLog = item.submittedAt ? [{
    nama: item.employeeName || item.employee?.fullName || 'Pemohon', 
    waktu: logDateText(item.submittedAt), 
    statusBadge: 'DIAJUKAN',
    catatan: 'Permohonan cuti diajukan.',
  }] : [];

  return {
    id: item.leaveRequestId || item.id,
    karyawan: {
      // [BARU] employeeId dari LeaveApprovalResponse.employeeId (backend) --
      // dipakai ApproveLeave.jsx buat mencocokkan Total Sisa Cuti milik
      // karyawan pemohon lewat ID, bukan nama lengkap (aman dari tabrakan
      // nama kembar).
      employeeId: item.employeeId ?? null,
      nama: item.employeeName || item.employee?.fullName || 'Pemohon',
      kode: `CUTI-${item.leaveRequestId || item.id}`,
      jabatan: '-',
    },
    jenisCuti: item.leaveType?.name || item.leaveType || 'Cuti',
    // [UBAH] Sesi Pagi/Siang disisipkan di sini supaya otomatis tampil di
    // popup Detail Cuti (Form.jsx -> "Durasi Kerja") & ListSection.jsx.
    durasi: `${dateText(item.startDate)} - ${dateText(item.endDate)} (${dayText(totalDays)} Hari${sessionSuffix(item)})`,
    totalDays,
    session: item.session ?? null,
    keterangan: item.reason || '-',
    pendingWork: item.pendingWork || '-',
    pekerjaanTertunda: item.pendingWork || '-',
    coveredBy: item.coveredBy || '-',
    dicoverOleh: item.coveredBy || '-',
    statusBerkas: statusCode(item.overallStatus || item.status?.statusName || item.status),
    approvalChain: chain,
    submittedAt: item.submittedAt || null, 
    riwayatLog: [
      ...submissionLog,
      ...logs.filter(log => String(log.action).toUpperCase() !== 'PENDING').map(log => ({
        nama: log.approverName || log.approverRole,
        waktu: logDateText(log.actedAt),
        statusBadge: logStatusLabel(log.action),
        catatan: log.note || '-',
      })),
    ],
  };
}

// [BARU MERGED] Dipakai tab "Cuti Karyawan" di halaman Manajemen Karyawan (HR/Super Admin)
// [FIX] Sebelumnya approvalChain di-hardcode '-' semua, sehingga modal
// "Rincian" (FormCuti, dipakai bersama dengan halaman Approval Cuti) selalu
// menampilkan App. Leader/SPV/Manager kosong padahal di halaman Approval
// datanya muncul benar. Disamakan dengan logika mapApproval() supaya kedua
// halaman konsisten memakai sumber data yang sama (assignment & approvalLogs).
export function mapKaryawanLeave(item, employeeLookup = {}) {
  const status = item.status?.statusName || item.status || 'PENDING';
  const hasBeenReviewed = String(status).toUpperCase() !== 'PENDING';
  const totalDays = normalizedLeaveDays(item);
  const logs = Array.isArray(item.approvalLogs) ? item.approvalLogs : [];

  const leaderAssigned = item.leader?.fullName || item.leader?.nama || item.leaderEmployee?.fullName || item.leaderName;
  const spvAssigned = item.spv?.fullName || item.spv?.nama || item.spvEmployee?.fullName || item.spvName;
  const managerAssigned = item.manager?.fullName || item.manager?.nama || item.managerEmployee?.fullName || item.managerName;

  const leaderById = employeeLookup[item.leaderEmployeeId] || employeeLookup[item.leaderId];
  const spvById = employeeLookup[item.spvEmployeeId] || employeeLookup[item.spvId];
  const managerById = employeeLookup[item.managerEmployeeId] || employeeLookup[item.managerId];

  const getApproverFromLog = (role) => logs.find(log => String(log.approverRole).toUpperCase() === role)?.approverName;

  const chain = {
    leader: getApproverFromLog('LEADER') || leaderAssigned || leaderById || '-',
    spv: getApproverFromLog('SPV') || spvAssigned || spvById || '-',
    manager: getApproverFromLog('MANAGER') || managerAssigned || managerById || '-',
  };

  return {
    id: item.leaveRequestId,
    karyawan: { nama: item.employee?.fullName, kode: item.employee?.nikKaryawan || '-' },
    jenisCuti: item.leaveType?.name || 'Cuti',
    // [UBAH] Sesi Pagi/Siang disisipkan di sini juga, supaya konsisten
    // dengan mapApproval() saat popup Detail Cuti dibuka dari halaman
    // Manajemen Karyawan (tab "Cuti Karyawan").
    durasi: `${dateText(item.startDate)} - ${dateText(item.endDate)} (${dayText(totalDays)} Hari${sessionSuffix(item)})`,
    session: item.session ?? null,
    statusBerkas: statusCode(status),
    keterangan: item.reason || '-',
    pekerjaanTertunda: item.pendingWork || '-',
    dicoverOleh: item.coveredBy || '-',
    approvalChain: chain,
    riwayatLog: hasBeenReviewed ? [{
      nama: item.reviewedBy?.fullName || 'Sistem',
      waktu: logDateText(item.approvedAt || item.returnedAt),
      statusBadge: logStatusLabel(status),
      catatan: item.reviewNote || '-',
    }] : [],
  };
}

// [BARU MERGED] Mengambil seluruh cuti untuk HR
export async function getAllLeaveRequestsForHr() {
  const res = await api.get('/api/cuti');
  return Array.isArray(res) ? res.map(mapKaryawanLeave) : [];
}

export const getPendingApprovals = async () => {
  const res = await api.get('/api/cuti/approvals/my-task');
  return Array.isArray(res) ? res.map(item => mapApproval(item)) : [];
};

export const getApprovalHistory = async () => {
  const res = await api.get('/api/cuti/approvals/history');
  return Array.isArray(res) ? res.map(item => mapApproval(item)) : [];
};

export const getApprovalDetail = async (id) => {
  const res = await api.get(`/api/cuti/approvals/${id}`);
  return mapApproval(res);
};
export const takeApprovalAction = (id, action, note) => api.put(`/api/cuti/${id}/${action}`, { note });