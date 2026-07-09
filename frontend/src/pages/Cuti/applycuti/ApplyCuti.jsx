import React, { useState, useRef, useEffect } from 'react';
import { submitCuti, getRiwayatByUser } from '../../../services/cutiService';
import LeaveSummaryCard from '../applycuti/components/LeaveSummaryCard';
import LeaveForm from '../applycuti/components/LeaveForm';
import LeaveHistory from '../applycuti/components/LeaveHistory';
import LeaveDetailModal from '../applycuti/components/LeaveDetailModal';
import '../applycuti/ApplyCuti.css';

// ==========================================
// 1. KONEKSI API: DATA HARI LIBUR NASIONAL
// ==========================================
// Keterangan Fungsi: Mengambil daftar tanggal merah dari database / external API Publik.
// Dampak: Validasi hitungBatasMinTanggal otomatis mengikuti kalender libur dinamis dari DB.
const hariLiburNasional = []; 
/* 
Contoh implementasi koneksi di dalam useEffect (jika ingin mengambil dari DB):
useEffect(() => {
  const fetchHariLibur = async () => {
    try {
      const response = await axios.get('/api/hari-libur');
      hariLiburNasional = response.data; // Misal formatnya ['2026-05-25', '2026-06-01']
    } catch (error) { console.error(error); }
  };
  fetchHariLibur();
}, []);
*/

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
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null); // TAMBAHAN: State penampung ID data yang sedang diedit agar tidak membuat data baru

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
  
  // Sisa cuti tahunan sebaiknya ditarik langsung dari objek 'user' hasil query database login
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
    if (isEditing) return;

    const isMendesak = jenisCuti === 'Cuti Urgent' || jenisCuti === 'Cuti Berduka';
    if (isMendesak) {
      setDariTanggal(todayStr);
      setSampaiTanggal(todayStr);
    } else {
      setDariTanggal(dinamisBatasMinStr);
      setSampaiTanggal(dinamisBatasMinStr);
    }
  }, [jenisCuti, dinamisBatasMinStr, todayStr, isEditing]);


  // ==========================================
  // 2. KONEKSI API: GET DATA RIWAYAT CUTI USER
  // ==========================================
  // Nama Fungsi: loadRiwayat
  // Keterangan: Fungsi ini memanggil endpoint API database melalui `getRiwayatByUser(userId)`.
  // Catatan: Jika API database Anda aktif, blok kode isi array bohong-bohongan (Andi Wijaya, dll) di bawah wajib dihapus.
  const loadRiwayat = async () => {
    // Memanggil API database sungguhan
    let data = await getRiwayatByUser(userId);

    // JIKA MAU KONEK DATABASE: Hapus/Komentari blok kondisi "if (!data || data.length === 0)" ini!
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

  // ========================================================
  // KONEKSI API SEBELUMNYA (UPDATE STATUS UNREAD DI DB - OPSIONAL)
  // ========================================================
  // Keterangan: Jika item diklik, mengubah status "isUnread: false" di level UI.
  // Jika database membutuhkan sinkronisasi notifikasi, Anda bisa menembak API update status read di fungsi ini.
  const handleOpenDetail = (item) => {
    const dari = item.rawDetail?.dariTanggal || item.dariTanggal;
    const sampai = item.rawDetail?.sampaiTanggal || item.sampaiTanggal;
    let tanggalFinal = item.stringTanggal;

    // UBAH DI SINI: Proteksi parsing tanggal agar tidak memicu crash Invalid Date pada browser tertentu
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
      id: item.id, // Tambahkan ID agar tombol aksi/edit di dalam modal mengenali berkas
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
      /* 
      Contoh koneksi API update status baca di DB:
      axios.put(`/api/cuti/read/${item.id}`);
      */
    }      
  };    

  const handleEditKembali = (id) => {
    const itemTarget = riwayatCuti.find(item => item.id === id);
    if (itemTarget) {
      const dataSumber = itemTarget.rawDetail || itemTarget; // Proteksi destructuring data berstatus proses
      
      setEditingId(id);
      setJenisCuti(dataSumber.jenisCuti || 'Cuti tahunan');
      setDariTanggal(dataSumber.dariTanggal || todayStr);
      setSampaiTanggal(dataSumber.sampaiTanggal || todayStr);
      setAlasan(dataSumber.alasan || '');
      setPekerjaanTertunda(dataSumber.pekerjaanTertunda || '');
      setCoverOleh(dataSumber.coverOleh || '');
      setIsEditing(true);
      setLeaderApproval(dataSumber.leader?.nama || dataSumber.leaderApproval || '');
      setSpvApproval(dataSumber.spv?.nama || dataSumber.spvApproval || '');
      setManagerApproval(dataSumber.manager?.nama || dataSumber.managerApproval || '')

      if (formTopRef.current) {
        formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };


  // ==========================================
  // 3. KONEKSI API: SUBMIT FORM CUTI BARU (POST)
  // ==========================================
  // Nama Fungsi: handleSubmit
  // Keterangan: Fungsi ini mengumpulkan semua isi state input menjadi objek `payloadCuti`, lalu mengirimkannya ke database melalui service `submitCuti(payloadCuti)`.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canApplyCuti) return;
    setIsSubmitting(true);
    try {
      const payloadCuti = {
        userId, userName, jenisCuti,
        durasiSesi: jenisCuti === 'Cuti setengah hari' || jenisCuti === 'Cuti Urgent' ? durasiSesi : 'Seharian Penuh',
        dariTanggal, sampaiTanggal, leaderApproval, spvApproval, managerApproval, alasan, pekerjaanTertunda,
        coverOleh, // Pastikan field ini ikut dikirim ke DB jika dibutuhkan backend
        id: editingId
      };

      // MENGEKSEKUSI API INSERT DATABASE
      await submitCuti(payloadCuti);
      
      const selisihHari = jedaHariKerja === 0 ? "1 Hari" : `${jedaHariKerja} Hari Kerja`;
      const formatDari = new Date(dariTanggal.replace(/-/g, '/')).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      const formatSampai = new Date(sampaiTanggal.replace(/-/g, '/')).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      const formatTahun = new Date(sampaiTanggal.replace(/-/g, '/')).getFullYear();

      if (isEditing && editingId) {
        // UBAH DI SINI: Logika Update Data Lokal UI jika dalam mode edit (mencegah data baru bertambah)
        setRiwayatCuti(prev => prev.map(item => {
          if (item.id === editingId) {
            return {
              ...item,
              jenisCuti: jenisCuti.toUpperCase(),
              stringTanggal: `${formatDari} - ${formatSampai} ${formatTahun}`,
              totalHari: selisihHari,
              status: 'Proses', // Reset kembali ke proses setelah diperbaiki karyawan
              isUnread: true,
              rawDetail: {
                ...item.rawDetail,
                jenisCuti: jenisCuti,
                dariTanggal: dariTanggal,
                sampaiTanggal: sampaiTanggal,
                totalHari: selisihHari,
                alasan: alasan,
                pekerjaanTertunda: pekerjaanTertunda,
                coverOleh: coverOleh,
                leader: { nama: leaderApproval, status: 'Pending' },
                spv: { nama: spvApproval, status: 'Pending' },
                manager: { nama: managerApproval, status: 'Pending' }
              }
            };
          }
          return item;
        }));
      } else {
        // Logika Pengajuan Baru (Bawaan)
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
            coverOleh: coverOleh,
            leader: { nama: leaderApproval, status: 'Pending' },
            spv: { nama: spvApproval, status: 'Pending' },
            manager: { nama: managerApproval, status: 'Pending' }
          }
        };
        setRiwayatCuti(prev => [pengajuanBaru, ...prev]);
      }

      // Mereset isi Form Input setelah sukses tersimpan di DB
      setAlasan('');
      setPekerjaanTertunda('');
      setLeaderApproval('');
      setSpvApproval('');
      setManagerApproval('');
      setCoverOleh('');
      setIsEditing(false);
      setEditingId(null);

      alert(isEditing ? 'Perubahan Berkas Cuti Berhasil Diperbarui!' : 'Pengajuan Cuti Berhasil Dikirim!');
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
        coverOleh={coverOleh} setCoverOleh={setCoverOleh}
        jedaHariKerja={jedaHariKerja}
        dinamisBatasMinStr={dinamisBatasMinStr}
        formatDateDisplay={formatDateDisplay}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        canApplyCuti={canApplyCuti}
        todayStr={todayStr}
        currentUserRole={userRole}
        isEditing={isEditing}
        onCancelEdit={() => {
          setIsEditing(false);
          setEditingId(null)
          setAlasan('');
          setPekerjaanTertunda('');
          setCoverOleh('');
          setLeaderApproval('');
          setSpvApproval('');
          setManagerApproval('');
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
          handleEditKembali={handleEditKembali} // UBAH DI SINI: Meneruskan prop handler edit agar tombol di modal aktif
          onRefreshData={loadRiwayat}
        />
      )}
    </div>
  );
};

export default ApplyCuti;