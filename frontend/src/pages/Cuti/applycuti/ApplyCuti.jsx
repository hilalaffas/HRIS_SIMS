import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getApprovers, getLeaveBalance, getLeaveTypes, getMyLeaveDetail, getRiwayatByUser, mapApproval, resubmitCuti, submitCuti } from '../../../services/CutiService';
import LeaveSummaryCard from './components/LeaveSummaryCard';
import LeaveForm, { hariLiburNasional, hitungBatasMinTanggal } from './components/LeaveForm';
import LeaveHistory from './components/LeaveHistory';
import FormCuti from '../approve/components/Form';
import { getAllHolidays } from '../../../services/holidayService';
import './ApplyCuti.css';

const isoToday = () => new Date().toISOString().slice(0, 10);
const isSupervisor = (role = '') => ['LEADER', 'SPV', 'MANAGER'].includes(
  String(role).trim().toUpperCase().replace(/^ROLE_/, '')
);
const countWorkingDays = (startDate, endDate, holidayDates) => {
  if (!startDate || !endDate || startDate > endDate) return 0;
  let total = 0;
  for (const date = new Date(`${startDate}T00:00:00`); date <= new Date(`${endDate}T00:00:00`); date.setDate(date.getDate() + 1)) {
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!weekend && !holidayDates.has(key)) total++;
  }
  return total;
};

const ApplyCuti = ({ user }) => {
  const todayStr = isoToday();
  const userRole = user?.role || user?.jabatan || 'Karyawan';
  const atasan = isSupervisor(userRole);
  const [types, setTypes] = useState([]);
  const [approvers, setApprovers] = useState({ LEADER: [], SPV: [], MANAGER: [] });
  const [balance, setBalance] = useState(0);
  const [holidayDates, setHolidayDates] = useState(() => new Set());
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [jenisCuti, setJenisCuti] = useState('');
  const jedaHariKerja = ['Cuti Urgent', 'Cuti Berduka'].includes(jenisCuti) ? 0 : 5;
  const dinamisBatasMinStr = hitungBatasMinTanggal(jedaHariKerja, hariLiburNasional);
  const [durasiSesi, setDurasiSesi] = useState('Setengah Hari (Pagi)');
  const [dariTanggal, setDariTanggal] = useState(todayStr);
  const [sampaiTanggal, setSampaiTanggal] = useState(todayStr);
  const [alasan, setAlasan] = useState('');
  const [pekerjaanTertunda, setPekerjaanTertunda] = useState('');
  const [coverOleh, setCoverOleh] = useState('');
  const [leaderApproval, setLeaderApproval] = useState('');
  const [spvApproval, setSpvApproval] = useState('');
  const [managerApproval, setManagerApproval] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Berkas');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const jumlahHariCuti = countWorkingDays(dariTanggal, sampaiTanggal, holidayDates);
  const formTopRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [leaveTypes, leader, spv, manager, leaveBalance, records, holidays] = await Promise.all([
        getLeaveTypes(), getApprovers('LEADER'), getApprovers('SPV'), getApprovers('MANAGER'), getLeaveBalance(), getRiwayatByUser(),
        getAllHolidays(),
      ]);
      setTypes(leaveTypes); setJenisCuti(current => current || leaveTypes[0]?.name || '');
      setApprovers({ LEADER: leader, SPV: spv, MANAGER: manager });
      setBalance(leaveBalance.remainingAnnualLeave ?? 0); setHistory(records); setHolidayDates(new Set(holidays.map((holiday) => holiday.date))); setError('');
    } catch (err) { setError(err.message || 'Gagal memuat data cuti.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (atasan) { setLeaderApproval(''); setSpvApproval(''); } }, [atasan]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (new Date(dariTanggal) < new Date(dinamisBatasMinStr) || new Date(sampaiTanggal) < new Date(dariTanggal)) {
      setError('Tanggal cuti tidak sesuai dengan ketentuan pengajuan.'); return;
    }
    const type = types.find(item => item.name === jenisCuti);
    if (!type || !managerApproval || (!atasan && (!leaderApproval || !spvApproval))) {
      setError('Pilih seluruh approver yang wajib sebelum mengirim pengajuan.'); return;
    }
    setIsSubmitting(true);
    try {
      const payload = { leaveTypeId: type.leaveTypeId, dariTanggal, sampaiTanggal, alasan, pekerjaanTertunda, coverOleh,
        leaderEmployeeId: atasan ? null : Number(leaderApproval), spvEmployeeId: atasan ? null : Number(spvApproval), managerEmployeeId: Number(managerApproval) };
      if (editingId) {
        await resubmitCuti(editingId, payload);
      } else {
        await submitCuti(payload);
      }
      setAlasan(''); setPekerjaanTertunda(''); setCoverOleh(''); setLeaderApproval(''); setSpvApproval(''); setManagerApproval(''); setEditingId(null);
      await load(); alert(editingId ? 'Perbaikan cuti berhasil diajukan kembali.' : 'Pengajuan cuti berhasil dikirim.');
    } catch (err) { setError(err.message || 'Pengajuan cuti gagal dikirim.'); }
    finally { setIsSubmitting(false); }
  };

  const handleOpenDetail = async (item) => {
    setSelectedDetail({
      id: item.id, karyawan: { nama: item.userName || 'Pemohon' }, jenisCuti: item.jenisCuti,
      durasi: `${item.stringTanggal} (${item.totalHari})`, keterangan: item.rawDetail?.alasan || '-',
      pekerjaanTertunda: item.rawDetail?.pekerjaanTertunda || '-', dicoverOleh: item.rawDetail?.coverOleh || '-',
      statusBerkas: item.status === 'Dikembalikan' ? 'DIKEMBALIKAN' : 'PROSES', approvalChain: {}, riwayatLog: [],
    });
    try { setSelectedDetail(mapApproval(await getMyLeaveDetail(item.id))); }
    catch (err) { setError(err.message || 'Gagal memuat detail cuti.'); }
  };

  const handleEditKembali = (id) => {
    const item = history.find((record) => record.id === id);
    if (!item || item.status !== 'Dikembalikan') return;

    const detail = item.rawDetail || {};
    setJenisCuti(detail.jenisCuti || item.jenisCuti);
    setDariTanggal(detail.dariTanggal || todayStr);
    setSampaiTanggal(detail.sampaiTanggal || todayStr);
    setAlasan(detail.alasan || '');
    setPekerjaanTertunda(detail.pekerjaanTertunda || '');
    setCoverOleh(detail.coverOleh || '');
    setLeaderApproval('');
    setSpvApproval('');
    setManagerApproval('');
    setEditingId(id);
    setError('Lengkapi kembali approver, lalu simpan perbaikan cuti Anda.');
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError('');
  };

  return <div className="form-wrapper" ref={formTopRef}>
    <LeaveSummaryCard sisaCutiTahunan={balance} />
    {error && <div className="empty-history-box">{error}</div>}
    <LeaveForm {...{ jenisCuti, setJenisCuti, durasiSesi, setDurasiSesi, dariTanggal, setDariTanggal, sampaiTanggal, setSampaiTanggal,
      alasan, setAlasan, leaderApproval, setLeaderApproval, spvApproval, setSpvApproval, managerApproval, setManagerApproval, jedaHariKerja, dinamisBatasMinStr,
      pekerjaanTertunda, setPekerjaanTertunda, coverOleh, setCoverOleh, handleSubmit, isSubmitting, todayStr, jumlahHariCuti, isEditing: Boolean(editingId), onCancelEdit: cancelEdit }}
      leaveTypes={types} approvers={approvers} isSupervisor={atasan} currentUserRole={userRole} canApplyCuti />
    <LeaveHistory riwayatCuti={history} filterStatus={filterStatus} setFilterStatus={setFilterStatus} handleOpenDetail={handleOpenDetail} handleEditKembali={handleEditKembali} />
    {selectedDetail && <FormCuti data={selectedDetail} onClose={() => setSelectedDetail(null)} />}
  </div>;
};
export default ApplyCuti;
