import React, { useState, useRef, useEffect } from 'react';
import { submitCuti, getRiwayatByUser } from '../../../services/cutiService';
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

const ApplyCuti = ({ user }) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Form States
  const [jenisCuti, setJenisCuti] = useState('Cuti setengah hari');
  const [durasiSesi, setDurasiSesi] = useState('Setengah Hari (Pagi)');
  const [dariTanggal, setDariTanggal] = useState(todayStr);
  const [sampaiTanggal, setSampaiTanggal] = useState(todayStr);
  const [alasan, setAlasan] = useState('');
  const [leaderApproval, setLeaderApproval] = useState('');
  const [spvApproval, setSpvApproval] = useState('');
  const [managerApproval, setManagerApproval] = useState('');
  const [pekerjaanTertunda, setPekerjaanTertunda] = useState('');
  const [coverOleh, setCoverOleh] = useState('');

  // UI/History States
  const [riwayatCuti, setRiwayatCuti] = useState([]);
  const [filterStatus, setFilterStatus] = useState('Semua Berkas');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

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
  if (jenisCuti === 'Cuti Urgent' || jenisCuti === 'Cuti Berduka') {
    jedaHariKerja = 0;
  }

  const dinamisBatasMinStr = (jenisCuti === 'Cuti Urgent' || jenisCuti === 'Cuti Berduka') 
    ? todayStr 
    : hitungBatasMinTanggal(jedaHariKerja, hariLiburNasional);

  useEffect(() => {
    const isMendesak = jenisCuti === 'Cuti Urgent' || jenisCuti === 'Cuti Berduka';
    if (isMendesak) {
      setDariTanggal(todayStr);
      setSampaiTanggal(todayStr);
    } else {
      setDariTanggal(dinamisBatasMinStr);
      setSampaiTanggal(dinamisBatasMinStr);
    }
  }, [jenisCuti, dinamisBatasMinStr, todayStr]);

  // Fetch Data Riwayat Cuti
  const loadRiwayat = async () => {
    let data = await getRiwayatByUser(userId);

    if (!data || data.length === 0) {
      data = [
        {
          userId: 'karyawan_01',
          userName: 'Andi Wijaya',            
          id: 101,
          jenisCuti: 'CUTI TAHUNAN',
          stringTanggal: '25 June - 27 June 2026',
          totalHari: '3 Hari',
          status: 'Dikembalikan',
          isUnread: true,
          rawDetail: {
            jenisCuti: 'Cuti tahunan',
            dariTanggal: '2026-06-25',
            sampaiTanggal: '2026-06-27',
            totalHari: '3 Hari',
            alasan: 'Ada keperluan keluarga yang mendesak',
            pekerjaanTertunda: 'Pekerjaan harian di-handle oleh Tim A',
            leader: { nama: 'Aden', status: 'Approved' },
            spv: { nama: 'Mandala', status: 'Returned', catatan: 'Mohon reschedule kembali jadwal backup pekerjaan agar tidak tabrakan dengan perilisan fitur baru.' },
            manager: { nama: 'Ade Mulya', status: 'Pending' }
          }
        },
        {
          userId: userId,
          userName: userName,
          id: 102,
          jenisCuti: 'CUTI TAHUNAN',
          stringTanggal: '10 June - 12 June 2026',
          totalHari: '3 Hari',
          status: 'Disetujui (ACC)',
          isUnread: false,
          rawDetail: {
            jenisCuti: 'Cuti tahunan',
            dariTanggal: '2026-06-10',
            sampaiTanggal: '2026-06-12',
            totalHari: '3 Hari',
            alasan: 'Acara pernikahan saudara kandung',
            pekerjaanTertunda: 'Semua task sprint sudah diclose dan dimonitor oleh Kak Guntur',
            leader: { nama: 'Guntur', status: 'Approved' },
            spv: { nama: 'Mandala', status: 'Approved' },
            manager: { nama: 'Ade Mulya', status: 'Approved' }
          }
        }
      ];
    }

    const filteredResult = data.filter(item => {
      if (isManager) {
        return item.userId === userId || item.rawDetail?.manager?.nama?.toLowerCase() === userName.toLowerCase();
      }
      return item.userId === userId;
    });

    setRiwayatCuti(filteredResult);
  };

  useEffect(() => {
    loadRiwayat();
  }, [userId, userName, isManager]);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleOpenDetail = (item) => {
    // FORMAT CLEANING: Membuat penanggalan dinamis yang aman
    const dari = item.rawDetail?.dariTanggal || item.dariTanggal;
    const sampai = item.rawDetail?.sampaiTanggal || item.sampaiTanggal;
    let tanggalFinal = item.stringTanggal;

    if (dari && sampai) {
      const formatDari = new Date(dari).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      const formatSampai = new Date(sampai).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      const formatTahun = new Date(sampai).getFullYear();
      tanggalFinal = `${formatDari} - ${formatSampai} ${formatTahun}`;
    }

    setSelectedDetail({
      ...(item.rawDetail || {}),
      pemohon: item.userName || 'Karyawan', 
      jenisCuti: item.rawDetail?.jenisCuti || item.jenisCuti,
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
    if (itemTarget && itemTarget.rawDetail) {
      setJenisCuti(itemTarget.rawDetail.jenisCuti || 'Cuti tahunan');
      setDariTanggal(itemTarget.rawDetail.dariTanggal || todayStr);
      setSampaiTanggal(itemTarget.rawDetail.sampaiTanggal || todayStr);
      setAlasan(itemTarget.rawDetail.alasan || '');
      setPekerjaanTertunda(itemTarget.rawDetail.pekerjaanTertunda || '');

      if (formTopRef.current) {
        formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canApplyCuti) return;
    setIsSubmitting(true);
    try {
      const payloadCuti = {
        userId, userName, jenisCuti,
        durasiSesi: jenisCuti === 'Cuti setengah hari' || jenisCuti === 'Cuti Urgent' ? durasiSesi : 'Seharian Penuh',
        dariTanggal, sampaiTanggal, leaderApproval, spvApproval, managerApproval, alasan, pekerjaanTertunda,
      };

      await submitCuti(payloadCuti);
      
      const selisihHari = jedaHariKerja === 0 ? "1 Hari" : `${jedaHariKerja} Hari Kerja`;
      const formatDari = new Date(dariTanggal).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      const formatSampai = new Date(sampaiTanggal).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      const formatTahun = new Date(sampaiTanggal).getFullYear();

      const pengajuanBaru = {
        userId: userId,
        userName: userName,
        id: Date.now(), 
        jenisCuti: jenisCuti.toUpperCase(),
        stringTanggal: `${formatDari} - ${formatSampai} ${formatTahun}`,
        totalHari: selisihHari,
        status: 'Proses', 
        isUnread: true,
        rawDetail: {
          jenisCuti: jenisCuti,
          dariTanggal: dariTanggal,
          sampaiTanggal: sampaiTanggal,
          totalHari: selisihHari,
          alasan: alasan,
          pekerjaanTertunda: pekerjaanTertunda,
          leader: { nama: leaderApproval, status: 'Pending' },
          spv: { nama: spvApproval, status: 'Pending' },
          manager: { nama: managerApproval, status: 'Pending' }
        }
      };

      setRiwayatCuti(prev => [pengajuanBaru, ...prev]);

      setAlasan('');
      setPekerjaanTertunda('');
      setLeaderApproval('');
      setSpvApproval('');
      setManagerApproval('');

      alert('Pengajuan Cuti Berhasil Dikirim!');
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
        jenisCuti={jenisCuti} setJenisCuti={setJenisCuti}
        durasiSesi={durasiSesi} setDurasiSesi={setDurasiSesi}
        dariTanggal={dariTanggal} setDariTanggal={setDariTanggal}
        sampaiTanggal={sampaiTanggal} setSampaiTanggal={setSampaiTanggal}
        alasan={alasan} setAlasan={setAlasan}
        leaderApproval={leaderApproval} setLeaderApproval={setLeaderApproval}
        spvApproval={spvApproval} setSpvApproval={setSpvApproval}
        managerApproval={managerApproval} setManagerApproval={setManagerApproval}
        pekerjaanTertunda={pekerjaanTertunda} setPekerjaanTertunda={setPekerjaanTertunda}
        jedaHariKerja={jedaHariKerja}
        dinamisBatasMinStr={dinamisBatasMinStr}
        formatDateDisplay={formatDateDisplay}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        canApplyCuti={canApplyCuti}
        todayStr={todayStr}
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
        />
      )}
    </div>
  );
};

export default ApplyCuti;