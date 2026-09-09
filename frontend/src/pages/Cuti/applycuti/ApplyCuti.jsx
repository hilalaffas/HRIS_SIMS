import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getApprovers, getLeaveBalance, getLeaveTypes, getMyLeaveDetail, getRiwayatByUser, mapApproval, resubmitCuti, submitCuti } from '../../../services/CutiService';
import CutiSummaryCards from '../../Dashboard/components/CutiSummaryCards';
import LeaveForm from './components/LeaveForm';
import { hariLiburNasional, hitungBatasMinTanggal } from '../../../utils/dateUtils'; // sesuaikan path file Anda
import LeaveHistory from './components/LeaveHistory';
import FormCuti from '../approve/components/Form';
import NotifModal from './components/NotifModal';
import { getAllHolidays } from '../../../services/holidayService';
import './ApplyCuti.css';

// [BARU] Interval polling live-sync riwayat cuti (lihat useEffect di bawah).
const HISTORY_POLL_INTERVAL_MS = 15000;

const isoToday = () => new Date().toISOString().slice(0, 10);
const isSupervisor = (role = '') => ['LEADER', 'SPV', 'MANAGER'].includes(
  String(role).trim().toUpperCase().replace(/^ROLE_/, '')
);
// [BARU] Deteksi gender pemohon (dipakai buat batasan Cuti Melahirkan).
// Backend menyimpan gender sebagai 'L' (Laki-laki) atau 'P'/'F' (Perempuan).
const isFemaleUser = (genderValue = '') => ['P', 'F', 'PEREMPUAN', 'FEMALE'].includes(
  String(genderValue).trim().toUpperCase()
);
const addMonthsToDateStr = (dateStr, months) => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  // [PERBAIKAN] Jangan pakai toISOString() -- itu konversi ke UTC dan bisa
  // bikin tanggal mundur 1 hari di timezone yang lebih cepat dari UTC
  // (mis. WIB/UTC+7). Format manual dari komponen tanggal LOKAL.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
// [BARU] Batas Cuti Melahirkan: Laki-laki (pendamping) maksimal 2 hari,
// Perempuan maksimal 3 bulan sejak tanggal mulai.
const MATERNITY_MAX_DAYS_MALE = 2;
const MATERNITY_MAX_MONTHS_FEMALE = 3;
// [BARU] Konversi dua arah antara label dropdown "DURASI SESI SETENGAH
// HARI" (LeaveTypeDateSection.jsx) dengan kode sesi mentah "PAGI"/"SIANG"
// yang disimpan backend (leave_requests.session). Sebelumnya TIDAK ADA
// konversi ini sama sekali -- durasiSesi cuma tersimpan di state lokal
// lalu buntu, tidak pernah ikut terkirim ke payload submit/resubmit.
const SESSION_CODE_BY_LABEL = {
  'Setengah Hari (Pagi)': 'PAGI',
  'Setengah Hari (Siang)': 'SIANG',
};
const SESSION_LABEL_BY_CODE = {
  PAGI: 'Setengah Hari (Pagi)',
  SIANG: 'Setengah Hari (Siang)',
};
const DEFAULT_SESSION_LABEL = 'Setengah Hari (Pagi)';
// [BARU] Batas Cuti Meninggal: maksimal 2 hari kerja (lihat handleSubmit &
// LeaveTypeDateSection.jsx untuk validasi tanggal + info alert-nya).
const BEREAVEMENT_MAX_DAYS = 2;
const isBereavementLeave = (leaveType = '') => String(leaveType).trim().toLowerCase().includes('meninggal');
const countWorkingDays = (startDate, endDate, holidayDates, jenisCuti, isFemale = false) => {
  if (!startDate || !endDate) return 0;
  if (startDate > endDate) return 0;

  const normalizedJenisCuti = String(jenisCuti).toLowerCase();

  // Aturan Khusus: Jika Cuti Setengah Hari
  if (normalizedJenisCuti === 'cuti setengah hari') {
    return 0.5;
  }

  // [UBAH] Cuti Melahirkan PEREMPUAN tetap hari KALENDER (kontinu, batas 3
  // bulan tidak boleh terpotong akhir pekan/hari libur). Cuti Melahirkan
  // LAKI-LAKI (pendamping) sekarang ikut hari KERJA seperti jenis cuti lain
  // -- konsisten dengan perubahan batas di LeaveService.java (backend).
  if (normalizedJenisCuti.includes('melahirkan') && isFemale) {
    const diffDays = Math.round(
      (new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000
    ) + 1;
    return diffDays > 0 ? diffDays : 0;
  }

  // Jika tanggal sama dan merupakan hari kerja normal
  if (startDate === endDate) {
    const tempDate = new Date(`${startDate}T00:00:00`);
    const weekend = tempDate.getDay() === 0 || tempDate.getDay() === 6;
    const key = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
    
    if (!weekend && !holidayDates.has(key)) {
      return 1; // Terhitung 1 hari kerja jika di hari yang sama
    }
    return 0; // 0 jika ternyata memilih hari libur/weekend
  }

  // Perhitungan dinamis rentang tanggal yang berbeda
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
  // [BARU] Dipakai buat batasan Cuti Melahirkan (lihat isFemaleUser di atas).
  const isFemale = isFemaleUser(user?.gender || user?.jenisKelamin);
  const [types, setTypes] = useState([]);
  const [approvers, setApprovers] = useState({ LEADER: [], SPV: [], MANAGER: [] });
  // [UBAH] Sekarang nyimpen objek balance lengkap (bukan cuma angka
  // remainingAnnualLeave) supaya CutiSummaryCards bisa nampilin Total.
  const [balance, setBalance] = useState(null);
  const [holidayDates, setHolidayDates] = useState(() => new Set());
  const [history, setHistory] = useState([]);
  // [BARU] Timestamp sinkronisasi terakhir, dipakai LeaveHistory untuk
  // menampilkan indikator "Live · terakhir diperbarui ...".
  const [historySyncedAt, setHistorySyncedAt] = useState(null);
  const [error, setError] = useState('');
  const [jenisCuti, setJenisCuti] = useState('');
  // [UBAH] Cuti Meninggal ikut dibebaskan dari jeda H-5 (bisa diajukan
  // kapan saja), dicek pakai isBereavementLeave() supaya tetap berlaku
  // walau nama tepatnya berbeda suffix.
  const jedaHariKerja = ['Cuti Urgent', 'Cuti Berduka', 'Cuti Setengah Hari'].includes(jenisCuti) || isBereavementLeave(jenisCuti) ? 0 : 5;
  const dinamisBatasMinStr = hitungBatasMinTanggal(jedaHariKerja, hariLiburNasional);
  const [durasiSesi, setDurasiSesi] = useState('Setengah Hari (Pagi)');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [pendingWork, setPendingWork] = useState('');
  const [coveredBy, setCoveredBy] = useState('');
  const [leaderEmployeeId, setLeaderEmployeeId] = useState('');
  const [spvEmployeeId, setSpvEmployeeId] = useState('');
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Berkas');
  const [selectedDetail, setSelectedDetail] = useState(null);
  // [BARU] Menandai apakah popup detail (FormCuti) sedang dalam MODE EDIT
  // (form edit dirender di dalam modal yang sama) vs MODE LIHAT (read-only).
  // Lihat handleEditInModal/handleCancelModalEdit/handleModalEditSubmit.
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const jumlahHariCuti = countWorkingDays(startDate, endDate, holidayDates, jenisCuti, isFemale);
  const formTopRef = useRef(null);

  // Gabungan semua approver (LEADER, SPV, MANAGER) menjadi map { employeeId: fullName }
  // Dipakai sebagai fallback untuk menampilkan nama approver di popup detail,
  // kalau-kalau Backend hanya mengirim ID approver tanpa objek nama lengkapnya.
  const employeeLookup = [...approvers.LEADER, ...approvers.SPV, ...approvers.MANAGER]
    .reduce((acc, person) => {
      acc[person.employeeId] = person.fullName;
      return acc;
    }, {});

  const load = useCallback(async () => {
    try {
      const [leaveTypes, leader, spv, manager, leaveBalance, records, holidays] = await Promise.all([
        getLeaveTypes(), getApprovers('LEADER'), getApprovers('SPV'), getApprovers('MANAGER'), getLeaveBalance(), getRiwayatByUser(),
        getAllHolidays(),
      ]);
      setTypes(leaveTypes); setJenisCuti(current => current || leaveTypes[0]?.name || '');
      setApprovers({ LEADER: leader, SPV: spv, MANAGER: manager });
      // Kompensasi data lama yang pernah tersimpan sebagai 1 hari sebelum backend
      // mendukung pecahan. Jika API sudah mengirim 0,5, nilai koreksinya otomatis nol.
      const legacyHalfDayCorrection = records
        .filter(record => record.status === 'Disetujui (ACC)' && record.totalDays === 0.5 && record.reportedTotalDays === 1)
        .length * 0.5;
      // [UBAH] Koreksi legacy tetap diterapkan, tapi sekarang ke objek
      // balance lengkap (remainingAnnualLeave & totalRemainingLeave),
      // supaya field lain (Sisa Cuti manual, tanggal refresh) tetap terbawa.
      const correctedAnnual = (leaveBalance.remainingAnnualLeave ?? 0) + legacyHalfDayCorrection;
      setBalance({
        ...leaveBalance,
        remainingAnnualLeave: correctedAnnual,
        totalRemainingLeave: correctedAnnual + (leaveBalance.remainingManualLeave ?? 0),
      });
      setHistory(records); setHolidayDates(new Set(holidays.map((holiday) => holiday.date))); setError('');
    } catch (err) { setError(err.message || 'Gagal memuat data cuti.'); }
  }, []);

  useEffect(() => {
    const initData = async () => {
      await load();
      const latest = await getRiwayatByUser();
      setHistory(latest);
      setHistorySyncedAt(new Date());
    };
    initData();

    // [BARU] Live-sync riwayat cuti: polling tiap 15 detik (interval yang
    // sama dipakai RiwayatCuti.jsx / badge notifikasi MainLayout.jsx),
    // plus langsung sinkron begitu tab ini kembali aktif. Fetch ini "silent"
    // (tidak ada spinner) supaya tidak mengganggu user yang sedang mengisi
    // formulir pengajuan cuti di atas.
    const syncHistory = async () => {
      try {
        const latest = await getRiwayatByUser();
        setHistory(latest);
        setHistorySyncedAt(new Date());
      } catch {
        // Diamkan error polling background -- error fetch awal (initData)
        // sudah cukup untuk ditampilkan lewat state `error`.
      }
    };
    const intervalId = window.setInterval(syncHistory, HISTORY_POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncHistory();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);  
  
  //useEffect(() => { if (atasan) { setLeaderEmployeeId(''); setSpvEmployeeId(''); } }, [atasan]);

  // Di dalam handleSubmit di ApplyCuti.js
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (new Date(startDate) < new Date(dinamisBatasMinStr) || new Date(endDate) < new Date(startDate)) {
      setError('Tanggal cuti tidak sesuai dengan ketentuan pengajuan.'); 
      return false;
    }
    // [UBAH] Validasi batas cuti khusus sesuai kebijakan (Melahirkan &
    // Meninggal). Laki-laki (pendamping melahirkan) sekarang divalidasi
    // pakai jumlahHariCuti (hari kerja), konsisten dengan backend.
    if (String(jenisCuti || '').toLowerCase().includes('melahirkan')) {
      if (isFemale) {
        const batasMaxTanggal = addMonthsToDateStr(startDate, MATERNITY_MAX_MONTHS_FEMALE);
        if (endDate > batasMaxTanggal) {
          setError(`Cuti melahirkan untuk karyawan perempuan maksimal ${MATERNITY_MAX_MONTHS_FEMALE} bulan sejak tanggal mulai.`);
          return false;
        }
      } else {
        if (jumlahHariCuti > MATERNITY_MAX_DAYS_MALE) {
          setError(`Cuti melahirkan (pendamping) untuk karyawan laki-laki maksimal ${MATERNITY_MAX_DAYS_MALE} hari kerja.`);
          return false;
        }
      }
    }
    // [BARU] Validasi batas Cuti Meninggal (maksimal BEREAVEMENT_MAX_DAYS
    // hari kerja).
    if (isBereavementLeave(jenisCuti)) {
      if (jumlahHariCuti > BEREAVEMENT_MAX_DAYS) {
        setError(`Cuti meninggal maksimal ${BEREAVEMENT_MAX_DAYS} hari kerja.`);
        return false;
      }
    }
    const type = types.find(item => item.name === jenisCuti);
    if (!type || !managerEmployeeId || (!atasan && (!leaderEmployeeId || !spvEmployeeId))) {
      setError('Pilih seluruh approver yang wajib sebelum mengirim pengajuan.'); 
      return false;
    }
    setIsSubmitting(true);
    try {
      // [BARU] Kirim kode sesi ("PAGI"/"SIANG") HANYA untuk Cuti Setengah
      // Hari -- jenis cuti lain selalu null, konsisten dengan komentar
      // backend "diabaikan untuk jenis cuti selain setengah hari".
      const isHalfDayLeave = String(jenisCuti || '').trim().toLowerCase() === 'cuti setengah hari';
      const payload = { 
        leaveTypeId: type.leaveTypeId, 
        startDate, 
        endDate, 
        reason, 
        pendingWork, 
        coveredBy,
        session: isHalfDayLeave ? (SESSION_CODE_BY_LABEL[durasiSesi] || 'PAGI') : null,
        leaderEmployeeId: atasan || !leaderEmployeeId ? null : Number(leaderEmployeeId), 
        spvEmployeeId: atasan || !spvEmployeeId ? null : Number(spvEmployeeId), 
        managerEmployeeId: Number(managerEmployeeId) 
      };
      
      if (editingId) {
        await resubmitCuti(editingId, payload);
      } else {
        await submitCuti(payload);
      }
      setReason(''); setPendingWork(''); setCoveredBy(''); setLeaderEmployeeId(''); setSpvEmployeeId(''); setManagerEmployeeId(''); setEditingId(null);
      await load(); 
      alert(editingId ? 'Perbaikan cuti berhasil diajukan kembali.' : 'Pengajuan cuti berhasil dikirim.');
      return true;
    } catch (err) {
        console.error(err);
        setError(err.response?.data?.message ||err.message ||"Gagal");
        return false;
    } finally { 
          setIsSubmitting(false); 
        }
  };
  
  const handleOpenDetail = async (item) => {
    setSelectedDetail({
      id: item.id, karyawan: { nama: item.userName || 'Pemohon' }, jenisCuti: item.jenisCuti,
      durasi: `${item.stringTanggal} (${item.totalHari})`, keterangan: item.rawDetail?.reason || '-',
      pendingWork: item.rawDetail?.pendingWork || '-', coveredBy: item.rawDetail?.coveredBy || '-',
      statusBerkas: item.status === 'Dikembalikan' ? 'DIKEMBALIKAN' : item.status === 'Disetujui (ACC)' ? 'DISETUJUI' : item.status === 'Ditolak' ? 'DITOLAK' : 'PROSES', approvalChain: {}, riwayatLog: [],
    });
    try { setSelectedDetail(mapApproval(await getMyLeaveDetail(item.id), employeeLookup)); }
    catch (err) { setError(err.message || 'Gagal memuat detail cuti.'); }
  };

  // [UBAH] Sekarang menerima parameter opsional ke-2 `{ scrollToForm,
  // showReminder }`, default keduanya TRUE -- artinya dipanggil tanpa opsi
  // (seperti tombol "Edit" di LeaveHistory.jsx) perilakunya PERSIS SAMA
  // seperti sebelumnya (scroll ke form atas + tampilkan reminder approver).
  // Dipakai dengan opsi FALSE oleh handleEditInModal (edit di dalam popup
  // detail), karena di situ tidak perlu scroll (modal sudah di layar) dan
  // reminder cukup terlihat dari kolom approver yang kosong di form.
  const handleEditKembali = (id, { scrollToForm = true, showReminder = true } = {}) => {
    const item = history.find((record) => record.id === id);
    if (!item || item.status !== 'Dikembalikan') return;

    const detail = item.rawDetail || {};
    setJenisCuti(detail.jenisCuti || item.jenisCuti);
    // [BARU] Kembalikan dropdown "DURASI SESI SETENGAH HARI" ke pilihan
    // semula (Pagi/Siang) dari kode sesi yang tersimpan -- sebelumnya baris
    // ini tidak ada sama sekali, jadi dropdown selalu reset ke default
    // "Pagi" walau pengajuan aslinya sesi "Siang".
    setDurasiSesi(SESSION_LABEL_BY_CODE[detail.session] || DEFAULT_SESSION_LABEL);
    setStartDate(detail.startDate || todayStr);
    setEndDate(detail.endDate || todayStr);
    setReason(detail.reason || '');
    setPendingWork(detail.pendingWork || '');
    setCoveredBy(detail.coveredBy || '');
    setLeaderEmployeeId('');
    setSpvEmployeeId('');
    setManagerEmployeeId('');
    setEditingId(id);
    if (showReminder) setError('Lengkapi kembali approver, lalu simpan perbaikan cuti Anda.');
    if (scrollToForm) formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError('');
  };

  // [BARU] Dipanggil dari tombol "Edit Berkas" DI DALAM popup detail
  // (FormCuti). Beda dengan tombol "Edit" di List Riwayat: TIDAK menutup
  // modal & TIDAK scroll ke form atas -- modal yang sama langsung berpindah
  // ke mode edit (lihat prop `editForm` di render FormCuti di bawah).
  const handleEditInModal = () => {
    if (!selectedDetail?.id) return;
    handleEditKembali(selectedDetail.id, { scrollToForm: false, showReminder: false });
    setIsModalEditing(true);
  };

  // [BARU] Tombol "Batal Edit" saat mode edit di dalam modal -- kembali ke
  // tampilan lihat detail (read-only) pada modal yang sama, TANPA menutupnya.
  const handleCancelModalEdit = () => {
    cancelEdit();
    setIsModalEditing(false);
  };

  // [BARU] Menutup popup detail sepenuhnya (klik X / klik area luar / tombol
  // "Tutup Detail"). Kalau ditutup saat masih dalam mode edit, batalkan dulu
  // proses editnya (reset editingId) supaya form di halaman utama tidak
  // "nyangkut" dalam status edit yang tidak terlihat oleh user.
  const handleCloseDetailModal = () => {
    if (isModalEditing) cancelEdit();
    setIsModalEditing(false);
    setSelectedDetail(null);
  };

  // [BARU] Submit KHUSUS untuk form edit di dalam modal. Memanggil
  // handleSubmit yang sama persis dipakai form utama (jadi semua validasi &
  // logika pengiriman tetap satu sumber kebenaran) -- modal baru ditutup &
  // kembali ke mode lihat detail JIKA submit-nya berhasil. Kalau gagal
  // (validasi/error server), modal TETAP di mode edit supaya user bisa
  // langsung perbaiki, dan pesan errornya tetap tampil lewat NotifModal.
  const handleModalEditSubmit = async (event) => {
    const success = await handleSubmit(event);
    if (success) {
      setIsModalEditing(false);
      setSelectedDetail(null);
    }
  };

  return <div className="form-wrapper" ref={formTopRef}>
    <div className="applycuti-summary-wrapper">
      <CutiSummaryCards balance={balance} />
    </div>
    {/* [UBAH] Sebelumnya kotak inline (.empty-history-box) di atas formulir --
        posisinya bisa "tenggelam" kalau formulir panjang, dan user harus
        scroll ke atas untuk sadar ada kesalahan. Sekarang jadi popup
        (NotifModal) yang selalu tampil di tengah layar dan WAJIB ditutup
        lewat tombol "OK". */}
    <NotifModal type="error" message={error} onClose={() => setError('')} />
    <LeaveForm {...{ jenisCuti, setJenisCuti, durasiSesi, setDurasiSesi, startDate, setStartDate, endDate, setEndDate,
      reason, setReason, leaderEmployeeId, setLeaderEmployeeId, spvEmployeeId, setSpvEmployeeId, managerEmployeeId, setManagerEmployeeId, dinamisBatasMinStr,
      pendingWork, setPendingWork, coveredBy, setCoveredBy, handleSubmit, isSubmitting, todayStr, jumlahHariCuti, isEditing: Boolean(editingId), onCancelEdit: cancelEdit }}
      leaveTypes={types} approvers={approvers} isSupervisor={atasan} isFemale={isFemale} canApplyCuti />
    <LeaveHistory riwayatCuti={history} filterStatus={filterStatus} setFilterStatus={setFilterStatus} handleOpenDetail={handleOpenDetail} handleEditKembali={handleEditKembali} lastSyncedAt={historySyncedAt} />
    {selectedDetail && (
  <FormCuti
    data={selectedDetail}
    onClose={handleCloseDetailModal}
    onEdit={selectedDetail.statusBerkas === 'DIKEMBALIKAN' ? handleEditInModal : null}
    // [BARU] Saat isModalEditing aktif, modal dikasih <LeaveForm> yang SAMA
    // persis komponennya dengan form pengajuan di halaman utama -- jadi
    // kalender, dropdown sesi Pagi/Siang, pemilihan approver, & validasi
    // semuanya otomatis ikut, tidak perlu ditulis ulang. hideHeader supaya
    // tidak dobel dengan header modal ("Edit Berkas Cuti").
    editForm={isModalEditing ? (
      <LeaveForm {...{ jenisCuti, setJenisCuti, durasiSesi, setDurasiSesi, startDate, setStartDate, endDate, setEndDate,
        reason, setReason, leaderEmployeeId, setLeaderEmployeeId, spvEmployeeId, setSpvEmployeeId, managerEmployeeId, setManagerEmployeeId, dinamisBatasMinStr,
        pendingWork, setPendingWork, coveredBy, setCoveredBy, handleSubmit: handleModalEditSubmit, isSubmitting, todayStr, jumlahHariCuti,
        isEditing: true, onCancelEdit: handleCancelModalEdit, hideHeader: true }}
        leaveTypes={types} approvers={approvers} isSupervisor={atasan} isFemale={isFemale} canApplyCuti />
    ) : null}
  />
)}
  </div>;
};
export default ApplyCuti;