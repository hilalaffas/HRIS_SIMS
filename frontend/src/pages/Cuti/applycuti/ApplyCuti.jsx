import React, { useState, useRef, useEffect } from 'react';
import { submitCuti, getRiwayatByUser, getAllApprovalOptions } from '../../../services/CutiService';
import LeaveSummaryCard from '../applycuti/components/LeaveSummaryCard';
import LeaveForm from '../applycuti/components/LeaveForm';
import LeaveHistory from '../applycuti/components/LeaveHistory';
import LeaveDetailModal from '../applycuti/components/LeaveDetailModal';
import '../applycuti/ApplyCuti.css';

const hariLiburNasional = []; 

const hitungBatasMinTanggal = (jumlahHariKerja, daftarHariLibur = []) => {
  let date = new Date();
  let sisaHari = jumlahHariKerja;

  while (sisaHari > 0) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isTanggalMerah = daftarHariLibur.includes(dateStr);

    if (!isWeekend && !isTanggalMerah) {
      sisaHari--;
    }
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// OPSI JENIS CUTI MENGIKUTI STRUKTUR DATABASE (leave_type_id & name)
const JENIS_CUTI_OPTIONS = [
  { leaveTypeId: 1, name: "Cuti tahunan" },
  { leaveTypeId: 2, name: "Cuti setengah hari" },
  { leaveTypeId: 3, name: "Cuti nikah (Khusus)" },
  { leaveTypeId: 4, name: "Cuti meninggal" },
  { leaveTypeId: 5, name: "Cuti melahirkan (Khusus)" },
  { leaveTypeId: 6, name: "Cuti Urgent" }
];

const ApplyCuti = ({ user }) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Form States disamakan dengan field LeaveForm & Database
  const [leaveTypeId, setLeaveTypeId] = useState(2); // Default ke Cuti setengah hari (ID: 2)
  const [leaveType, setLeaveType] = useState('Cuti setengah hari');
  const [durasiSesi, setDurasiSesi] = useState('Setengah Hari (Pagi)');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  
  const [leaderEmployeeId, setLeaderEmployeeId] = useState('');
  const [spvEmployeeId, setSpvEmployeeId] = useState('');
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  
  const [pendingWork, setPendingWork] = useState('');
  const [coveredBy, setCoveredBy] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null); 

  // UI/History States
  const [riwayatCuti, setRiwayatCuti] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Semua Berkas');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Opsi dropdown Approval (Leader/SPV/Manager), diambil dari "database" (cutiService)
  const [leaderOptions, setLeaderOptions] = useState([]);
  const [spvOptions, setSpvOptions] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);

  const formTopRef = useRef(null);

  // User Meta
  const userRole = (user?.jabatan || user?.role || 'karyawan').toLowerCase();
  const isManager = userRole.includes('manager');
  const canApplyCuti = !userRole.includes('super admin') && userRole !== 'superadmin';
  const userId = user?.id ?? 'guest';
  const userName = user?.nama || user?.name || 'Karyawan';
  
  const sisaCutiTahunan = user?.sisa_cuti_tahunan ?? 12; 

  // Jeda Hari Kerja Aturan Validasi
  let jedaHariKerja = 5;
  if (leaveType === 'Cuti Urgent' || leaveType === 'Cuti Berduka' || leaveType === 'Cuti meninggal') {
    jedaHariKerja = 0;
  }

  const dinamisBatasMinStr = (leaveType === 'Cuti Urgent' || leaveType === 'Cuti Berduka' || leaveType === 'Cuti meninggal') 
    ? todayStr 
    : hitungBatasMinTanggal(jedaHariKerja, hariLiburNasional);

  useEffect(() => {
    if (isEditing) return;

    const isMendesak = leaveType === 'Cuti Urgent' || leaveType === 'Cuti Berduka' || leaveType === 'Cuti meninggal';
    if (isMendesak) {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else {
      setStartDate(dinamisBatasMinStr);
      setEndDate(dinamisBatasMinStr);
    }
  }, [leaveType, dinamisBatasMinStr, todayStr, isEditing]);

  const loadRiwayat = async () => {
    try {
      const data = await getRiwayatByUser(userId);

      const filteredResult = (data || []).filter(item => {
        if (isManager) {
          return item.userId === userId || item.rawDetail?.manager?.nama?.toLowerCase() === userName.toLowerCase();
        }
        return item.userId === userId;
      });

      setRiwayatCuti(filteredResult);
    } catch (err) {
      console.error('Gagal mengambil riwayat cuti dari API:', err);
      setRiwayatCuti([]);
    }
  };

  useEffect(() => {
    loadRiwayat();
  }, [userId, userName, isManager]);

  useEffect(() => {
    const loadApprovalOptions = async () => {
      try {
        const { leaderOptions, spvOptions, managerOptions } = await getAllApprovalOptions();
        setLeaderOptions(leaderOptions);
        setSpvOptions(spvOptions);
        setManagerOptions(managerOptions);
      } catch (err) {
        console.error('Gagal mengambil data approval (Leader/SPV/Manager):', err);
      }
    };
    loadApprovalOptions();
  }, []);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleOpenDetail = (item) => {
    const dari = item.rawDetail?.dariTanggal || item.dariTanggal;
    const sampai = item.rawDetail?.sampaiTanggal || item.sampaiTanggal;
    let tanggalFinal = item.stringTanggal;

    if (dari && sampai) {
      try {
        const dObj = new Date(dari.replace(/-/g, '/'));
        const sObj = new Date(sampai.replace(/-/g, '/'));
        
        if (!isNaN(dObj) && !isNaN(sObj)) {
          const formatDari = dObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
          const formatSampai = sObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
          const formatTahun = sObj.getFullYear();
          tanggalFinal = `${formatDari} - ${formatSampai} ${formatTahun}`;
        }
      } catch (e) {
        tanggalFinal = item.stringTanggal;
      }
    }

    setSelectedDetail({
      ...(item.rawDetail || {}),
      id: item.id, 
      pemohon: item.userName || 'Karyawan', 
      leaveTypeId: item.rawDetail?.leaveTypeId || item.leaveTypeId,
      leaveType: item.rawDetail?.leaveType || item.leaveType,
      globalStatus: (item.status || 'PROSES').toUpperCase(), 
      stringTanggal: tanggalFinal || item.stringTanggal,
      logPemeriksaan: item.rawDetail?.logPemeriksaan || [
        {
          nama: `${item.userName} (ID: ${item.userId || 'SYS-2026-0005'})`, 
          tanggal: tanggalFinal, 
          aksi: 'DIAJUKAN',
          catatan: 'Mengajukan awal'
        }
      ]
    });

    if (item.isUnread) {
      setRiwayatCuti(prevRiwayat => 
        prevRiwayat.map(riwayat => 
          riwayat.id === item.id ? { ...riwayat, isUnread: false } : riwayat
        )
      );
    }      
  };    

  const handleEditKembali = (id) => {
    const itemTarget = riwayatCuti.find(item => item.id === id);
    if (itemTarget) {
      const dataSumber = itemTarget.rawDetail || itemTarget; 
      
      setEditingId(id);
      setLeaveTypeId(dataSumber.leaveTypeId || 1);
      setLeaveType(dataSumber.leaveType || 'Cuti tahunan');
      setStartDate(dataSumber.dariTanggal || todayStr);
      setEndDate(dataSumber.sampaiTanggal || todayStr);
      setReason(dataSumber.reason || '');
      setPendingWork(dataSumber.pendingWork || '');
      setCoveredBy(dataSumber.coveredBy || '');
      setIsEditing(true);
      setLeaderEmployeeId(dataSumber.leaderEmployeeId || '');
      setSpvEmployeeId(dataSumber.spvEmployeeId || '');
      setManagerEmployeeId(dataSumber.managerEmployeeId || '');

      if (formTopRef.current) {
        formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleSubmit = async (e) => {
    if (!canApplyCuti) return;
    setIsSubmitting(true);
    try {
      // KHUSUS ROLE MANAGER: jika ketiga approval dipilih "None", tidak ada
      // atasan lain yang bisa menyetujui — pengajuan otomatis dianggap
      // "Disetujui" tanpa proses approval berjenjang.
      const semuaApprovalNone = leaderEmployeeId === 'None' && spvEmployeeId === 'None' && managerEmployeeId === 'None';
      const isAutoApproved = isManager && semuaApprovalNone;
      const statusAwal = isAutoApproved ? 'Disetujui' : 'Proses';

      const payloadCuti = {
        userId, userName, leaveTypeId, leaveType,
        durasiSesi: leaveType === 'Cuti setengah hari' || leaveType === 'Cuti Urgent' ? durasiSesi : 'Seharian Penuh',
        dariTanggal: startDate, sampaiTanggal: endDate, leaderEmployeeId, spvEmployeeId, managerEmployeeId, reason, pendingWork,
        coveredBy,
        autoApproved: isAutoApproved,
        id: editingId
      };

      await submitCuti(payloadCuti);
      
      const selisihHari = jedaHariKerja === 0 ? "1 Hari" : `${jedaHariKerja} Hari Kerja`;
      const formatDari = new Date(startDate.replace(/-/g, '/')).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      const formatSampai = new Date(endDate.replace(/-/g, '/')).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      const formatTahun = new Date(endDate.replace(/-/g, '/')).getFullYear();

      if (isEditing && editingId) {
        setRiwayatCuti(prev => prev.map(item => {
          if (item.id === editingId) {
            return {
              ...item,
              leaveType: leaveType.toUpperCase(),
              stringTanggal: `${formatDari} - ${formatSampai} ${formatTahun}`,
              totalHari: selisihHari,
              status: statusAwal,
              isUnread: true,
              rawDetail: {
                ...item.rawDetail,
                leaveTypeId: leaveTypeId,
                leaveType: leaveType,
                dariTanggal: startDate,
                sampaiTanggal: endDate,
                totalHari: selisihHari,
                reason: reason,
                pendingWork: pendingWork,
                coveredBy: coveredBy,
                leader: isAutoApproved ? null : { nama: 'Pilihan Leader', status: 'Pending' },
                spv: isAutoApproved ? null : { nama: 'Pilihan SPV', status: 'Pending' },
                manager: isAutoApproved ? null : { nama: 'Pilihan Manager', status: 'Pending' }
              }
            };
          }
          return item;
        }));
      } else {
        const pengajuanBaru = {
          userId: userId,
          userName: userName,
          id: Date.now(), 
          leaveType: leaveType.toUpperCase(),
          stringTanggal: `${formatDari} - ${formatSampai} ${formatTahun}`,
          totalHari: selisihHari,
          status: statusAwal,
          isUnread: true,
          rawDetail: {
            leaveTypeId: leaveTypeId,
            leaveType: leaveType,
            dariTanggal: startDate,
            sampaiTanggal: endDate,
            totalHari: selisihHari,
            reason: reason,
            pendingWork: pendingWork,
            coveredBy: coveredBy,
            leaderEmployeeId, spvEmployeeId, managerEmployeeId
          }
        };
        setRiwayatCuti(prev => [pengajuanBaru, ...prev]);
      }

      setReason('');
      setPendingWork('');
      setLeaderEmployeeId('');
      setSpvEmployeeId('');
      setManagerEmployeeId('');
      setCoveredBy('');
      setIsEditing(false);
      setEditingId(null);

      alert(
        isEditing
          ? 'Perubahan Berkas Cuti Berhasil Diperbarui!'
          : isAutoApproved
            ? 'Pengajuan Cuti Berhasil Dikirim dan Otomatis Disetujui (tanpa approval atasan)!'
            : 'Pengajuan Cuti Berhasil Dikirim!'
      );
    } catch (err) {
      alert('Terjadi kesalahan, silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-wrapper" ref={formTopRef}>
      <LeaveSummaryCard sisaCutiTahunan={sisaCutiTahunan} />

      <LeaveForm
        leaveType={leaveType} setleaveType={setLeaveType}
        leaveTypeId={leaveTypeId} setLeaveTypeId={setLeaveTypeId}
        jenisCutiOptions={JENIS_CUTI_OPTIONS}
        leaderOptions={leaderOptions}
        spvOptions={spvOptions}
        managerOptions={managerOptions}
        durasiSesi={durasiSesi} setDurasiSesi={setDurasiSesi}
        startDate={startDate} setstartDate={setStartDate}
        endDate={endDate} setendDate={setEndDate}
        reason={reason} setReason={setReason}
        leaderEmployeeId={leaderEmployeeId} setleaderEmployeeId={setLeaderEmployeeId}
        spvEmployeeId={spvEmployeeId} setspvEmployeeId={setSpvEmployeeId}
        managerEmployeeId={managerEmployeeId} setmanagerEmployeeId={setManagerEmployeeId}
        pendingWork={pendingWork} setpendingWork={setPendingWork}
        coveredBy={coveredBy} setcoveredBy={setCoveredBy}
        jedaHariKerja={jedaHariKerja}
        dinamisBatasMinStr={dinamisBatasMinStr}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        canApplyCuti={canApplyCuti}
        todayStr={todayStr}
        currentUserRole={userRole}
        isEditing={isEditing}
        onCancelEdit={() => {
          setIsEditing(false);
          setEditingId(null);
          setReason('');
          setPendingWork('');
          setCoveredBy('');
          setLeaderEmployeeId('');
          setSpvEmployeeId('');
          setManagerEmployeeId('');
        }}
      />

      <LeaveHistory
        riwayatCuti={riwayatCuti}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        formatDateDisplay={formatDateDisplay}
        handleOpenDetail={handleOpenDetail}
        handleEditKembali={handleEditKembali}
      />

      {selectedDetail && (
        <LeaveDetailModal
          selectedDetail={selectedDetail}
          onClose={() => setSelectedDetail(null)}
          currentUserRole={userRole}
          handleEditKembali={handleEditKembali} 
          onRefreshData={loadRiwayat}
        />
      )}
    </div>
  );
};

export default ApplyCuti;