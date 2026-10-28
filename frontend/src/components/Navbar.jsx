import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRiwayatByUser, getPendingApprovals, getMyApprovalUpdates } from '../services/CutiService';
import { getMyAttendanceHistory } from '../services/attendanceService';
import { getPendingResetRequests } from '../services/passwordResetService';
import { isHrAdmin, isSuperAdmin, isManagerOrSpv } from '../utils/roles';
import { getCurrentUser } from '../services/authService';
import { isDevAccessUser, isDevAccessPath } from '../config/devAccessConfig';
import NotifPasswordResetModal from './NotifPasswordResetModal';
import NotifLeaveApprovalModal from './NotifLeaveApprovalModal';
import NotifBellToast from './NotifBellToast';
import { getNotificationAction } from '../config/notificationRoutes'; // [BARU]
import './Navbar.css';

const APPROVER_ROLE_LABELS = {
  LEADER: 'Leader',
  SPV: 'SPV',
  MANAGER: 'Manager',
};

// [UBAH] CLICKABLE_TYPES DIHAPUS -- daftar tipe yang bisa diklik + tujuannya
// sekarang ada di config/notificationRoutes.js (NOTIFICATION_ACTIONS).

// [BARU] Izin Sakit (modul Absensi) yang sudah diputuskan hanya jadi notifikasi
// selama N hari terakhir, supaya riwayat lama tidak membanjiri lonceng.
const SICK_NOTIF_WINDOW_DAYS = 14;

export default function Navbar({ toggleSidebar, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState('');

  // [BARU] Akun dev tidak punya data cuti/notifikasi, jadi polling-nya dilewati.
  const isDevAccount = isDevAccessUser(getCurrentUser());

  const [showDropdown, setShowDropdown] = useState(false);
  const notificationRef = useRef(null);

  // [BARU] Popup mini dari lonceng saat ada notifikasi BARU (cuti, sakit, izin,
  // dll -- apa pun yang masuk ke allNotifications).
  const bellButtonRef = useRef(null);
  const [bellToast, setBellToast] = useState(null); // { key, notification, extraCount }
  const [bellRingTick, setBellRingTick] = useState(0); // naik tiap ada notif baru -> ulang animasi lonceng & badge
  const seenNotifIdsRef = useRef(new Set());
  const baselineDoneRef = useRef(false);
  const showDropdownRef = useRef(false);
  // Tiap sumber polling menandai dirinya sudah selesai memuat pertama kali,
  // supaya notifikasi LAMA saat login tidak dianggap baru (tidak banjir popup).
  const [loadedSources, setLoadedSources] = useState({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [notifications, setNotifications] = useState([]);
  // [UBAH] holidayNotifications & announcementNotifications DIHAPUS TOTAL --
  // lonceng notifikasi sekarang murni perihal cuti (+ reset sandi untuk
  // HR/SuperAdmin). Berita/pengumuman tidak lagi ditampilkan di sini; tetap
  // bisa dilihat lewat panel Pengumuman & Portal Berita di Dashboard.
  const [resetRequests, setResetRequests] = useState([]);
  // [BARU] Izin Sakit milik sendiri yang sudah APPROVED/REJECTED (data absensi,
  // bukan data cuti -- jadi tidak ikut terbaca oleh polling cuti di atas).
  const [sickDecisions, setSickDecisions] = useState([]);
  const [selectedResetNotif, setSelectedResetNotif] = useState(null);
  const canSeeResetNotif = !isDevAccount && (isHrAdmin(user) || isSuperAdmin(user));

  const [leaveApprovalTasks, setLeaveApprovalTasks] = useState([]);
  const [selectedLeaveNotif, setSelectedLeaveNotif] = useState(null);
  const canSeeLeaveApprovalNotif = isManagerOrSpv(user);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const userRole = (user?.jabatan || user?.role || 'Karyawan').toLowerCase();
  const notificationOwner = user?.username || user?.name || user?.nama || 'guest';
  const notificationStorageKey = `read-leave-status-notifications:${notificationOwner}`;
  const [readRefreshToken, setReadRefreshToken] = useState(0);
  // [BARU] Naik hanya saat dropdown DIBUKA -> memicu refresh data. Sebelumnya efek
  // polling bergantung pada `showDropdown`, sehingga menutup dropdown (mis. saat
  // klik notifikasi) ikut memanggil ulang 2 API tepat ketika halaman tujuan
  // sedang dimuat -> terasa delay.
  const [notifRefreshTick, setNotifRefreshTick] = useState(0);

  const readNotificationIds = (() => {
    void readRefreshToken;
    try {
      const savedIds = JSON.parse(localStorage.getItem(notificationStorageKey) || '[]');
      return Array.isArray(savedIds) ? savedIds : [];
    } catch {
      return [];
    }
  })();
  // [UBAH] lastNotificationReadAt (cutoff waktu berbasis Date.now() milik
  // BROWSER) DIHAPUS -- sebelumnya dipakai sebagai filter tambahan di
  // allNotifications ("sembunyikan semua yang timestamp-nya <= waktu
  // terakhir klik Tandai Semua Dibaca"). Ini BUG: begitu satu akun pernah
  // klik "Tandai Semua Dibaca" sekali saja, cutoff itu jadi permanen --
  // notifikasi BARU yang dibuat setelahnya bisa saja tetap ikut
  // tersembunyi kalau getNotificationTime() gagal mem-parsing timestamp
  // dari backend (fallback-nya balik ke angka id yang kecil, jauh di bawah
  // cutoff manapun). Ini persis kasus yang dilaporkan Affas: akun
  // SuperAdmin yang pernah klik "Tandai Semua Dibaca" jadi tidak pernah
  // lagi menerima notifikasi reset sandi baru, padahal datanya sampai
  // dengan benar (akun HR Admin yang belum pernah klik tombol itu --
  // cutoff-nya masih 0 -- menerima notifikasi yang sama tanpa masalah).
  // Status "sudah dibaca" sekarang murni berbasis id lewat
  // readNotificationIds (lihat handleMarkNotificationsRead di bawah, yang
  // tetap menandai semua notifikasi yang SEDANG tampil sebagai sudah
  // dibaca) -- lebih aman karena tidak bisa "menelan" notifikasi baru
  // yang belum pernah benar-benar ditampilkan/ditandai.

  // [BARU] Sembunyikan SATU notifikasi saja. Dipakai tombol "×" (hapus) dan
  // dipanggil otomatis saat notifikasi diklik untuk membuka sesuatu, supaya
  // notifikasi itu tidak muncul lagi setelah ditindaklanjuti.
  const handleDismissOne = (id) => {
    const updatedIds = [...new Set([...readNotificationIds, id])];
    localStorage.setItem(notificationStorageKey, JSON.stringify(updatedIds));
    setReadRefreshToken((current) => current + 1);
  };

  // === NOTIFIKASI CUTI (status milik pemohon + progres approval + tugas atasan) ===
  useEffect(() => {
    if (notificationOwner === 'guest' || isDevAccount) return undefined;

    let isMounted = true;

    const fetchNotificationFromDB = async () => {
      const [riwayatResult, stepUpdatesResult] = await Promise.allSettled([
        // [UBAH] { silent: true } -- ini polling badge lonceng notifikasi,
        // BUKAN loading data utama halaman, jadi tidak boleh memicu
        // LoadingScreen global tiap 30 detik. Lihat services/api.js.
        getRiwayatByUser({ silent: true }),
        getMyApprovalUpdates({ silent: true }),
      ]);

      const mappedNotifications = [];

      if (riwayatResult.status === 'fulfilled') {
        const rawData = riwayatResult.value;

        (rawData || []).forEach((item) => {
          const statusBerkas = item.status ? item.status.toLowerCase() : 'proses';
          const jenisCutiNama = item.rawDetail?.jenisCuti || item.jenisCuti || 'Cuti tahunan';
          const stringTanggal = item.stringTanggal || 'Tanggal tidak tersedia';
          const pemohon = item.userName || 'Karyawan';

          if (statusBerkas.includes('kembali') || statusBerkas.includes('return')) {
            mappedNotifications.push({
              id: `ret-${item.id}`,
              text: <>Pengajuan <strong>{jenisCutiNama}</strong> Anda telah <strong>dikembalikan.</strong></>,
              date: stringTanggal,
              timestamp: item.statusChangedAt,
              type: 'returned',
              raw: item,
            });
          } else if (statusBerkas.includes('setuju') || statusBerkas.includes('acc')) {
            mappedNotifications.push({
              id: `app-${item.id}`,
              text: <>Pengajuan <strong>{jenisCutiNama}</strong> Anda telah <strong>disetujui.</strong></>,
              date: stringTanggal,
              timestamp: item.statusChangedAt,
              type: 'approved', // [BARU] type ini sekarang clickable -> buka modal detail cuti
              raw: item,
            });
          } else if (statusBerkas.includes('tolak') || statusBerkas.includes('reject')) {
            mappedNotifications.push({
              id: `rej-${item.id}`,
              text: <>Pengajuan <strong>{jenisCutiNama}</strong> Anda telah <strong>ditolak.</strong></>,
              date: stringTanggal,
              timestamp: item.statusChangedAt,
              type: 'rejected',
              raw: item,
            });
          }

          const isAtasanLeader = userRole.includes('leader') && item.rawDetail?.leader?.status?.toLowerCase() === 'pending';
          const isAtasanSPV = userRole.includes('spv') && item.rawDetail?.spv?.status?.toLowerCase() === 'pending';
          const isAtasanManager = userRole.includes('manager') && item.rawDetail?.manager?.status?.toLowerCase() === 'pending';

          if (isAtasanLeader || isAtasanSPV || isAtasanManager) {
            mappedNotifications.push({
              id: `new-${item.id}`,
              text: <>Ada pengajuan <strong>{jenisCutiNama}</strong> baru dari Karyawan ({pemohon}) menunggu persetujuan Anda.</>,
              date: stringTanggal,
              type: 'new',
              raw: item,
            });
          }
        });
      } else {
        console.error('Gagal memuat riwayat cuti untuk notifikasi:', riwayatResult.reason);
      }

      if (stepUpdatesResult.status === 'fulfilled') {
        (stepUpdatesResult.value || []).forEach((update) => {
          const roleLabel = APPROVER_ROLE_LABELS[update.approverRole] || update.approverRole;
          mappedNotifications.push({
            id: `step-${update.approvalId}`,
            text: (
              <>
                Pengajuan <strong>{update.leaveType}</strong> Anda telah disetujui oleh{' '}
                <strong>{roleLabel} {update.approverName}</strong>.
              </>
            ),
            date: update.actedAt
              ? new Date(update.actedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
              : '-',
            timestamp: update.actedAt,
            type: 'step-approved',
            raw: { id: update.leaveRequestId },
          });
        });
      } else {
        console.error('Gagal memuat progres approval untuk notifikasi:', stepUpdatesResult.reason);
      }

      if (isMounted) {
        setNotifications(mappedNotifications);
        setLoadedSources((prev) => (prev.cuti ? prev : { ...prev, cuti: true }));
      }
    };

    fetchNotificationFromDB();
    const intervalId = window.setInterval(fetchNotificationFromDB, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [notificationOwner, notificationStorageKey, userRole, notifRefreshTick, isDevAccount]); // [UBAH] showDropdown -> notifRefreshTick

  // === [BARU] NOTIFIKASI STATUS IZIN SAKIT (disetujui / ditolak) ===
  // Izin Sakit disimpan sebagai data absensi (approvalStatus PENDING ->
  // APPROVED/REJECTED), bukan data cuti, jadi butuh polling tersendiri.
  useEffect(() => {
    if (notificationOwner === 'guest' || isDevAccount) return undefined;

    let isMounted = true;

    const fetchSickDecisions = async () => {
      try {
        // { silent: true } -- polling lonceng, jangan memicu LoadingScreen global.
        const records = await getMyAttendanceHistory({ silent: true });
        const cutoff = Date.now() - SICK_NOTIF_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        const decided = (Array.isArray(records) ? records : []).filter((record) => {
          const approval = String(record.approvalStatus || '').toUpperCase();
          const attendanceTime = new Date(`${record.attendanceDate}T00:00:00`).getTime();
          return (
            String(record.reason || '').toUpperCase() === 'SAKIT'
            && (approval === 'APPROVED' || approval === 'REJECTED')
            && !Number.isNaN(attendanceTime)
            && attendanceTime >= cutoff
          );
        });
        if (isMounted) setSickDecisions(decided);
      } catch (error) {
        console.error('Gagal memuat notifikasi status izin sakit:', error);
      } finally {
        if (isMounted) setLoadedSources((prev) => (prev.sick ? prev : { ...prev, sick: true }));
      }
    };

    fetchSickDecisions();
    const intervalId = setInterval(fetchSickDecisions, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [notificationOwner, isDevAccount]);

  // id memuat status: kalau status berubah (mis. REJECTED -> diajukan ulang -> APPROVED)
  // id-nya baru, jadi popup & badge muncul lagi untuk perubahan itu.
  const sickNotifications = sickDecisions.map((record) => {
    const isApproved = String(record.approvalStatus).toUpperCase() === 'APPROVED';
    const days = Number(record.leaveDays) > 1 ? ` (${record.leaveDays} hari)` : '';
    return {
      id: `sick-${isApproved ? 'approved' : 'rejected'}-${record.attendanceId}`,
      text: (
        <>
          Pengajuan <strong>Izin Sakit{days}</strong> Anda telah{' '}
          <strong>{isApproved ? 'disetujui.' : 'ditolak.'}</strong>
        </>
      ),
      date: new Date(`${record.attendanceDate}T00:00:00`).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      }),
      timestamp: record.recordedAt,
      type: isApproved ? 'sick-approved' : 'sick-rejected',
      raw: record,
    };
  });

  // === NOTIFIKASI PERMINTAAN RESET SANDI (HR ADMIN / SUPER ADMIN) ===
  // Tidak berubah: Super Admin & HR Admin sama-sama melihat notifikasi ini.
  useEffect(() => {
    if (!canSeeResetNotif) return;

    let isMounted = true;

    const fetchResetRequests = async () => {
      try {
        // [UBAH] { silent: true } -- badge lonceng, bukan konten utama halaman.
        const data = await getPendingResetRequests({ silent: true });
        if (isMounted) setResetRequests(data || []);
      } catch (error) {
        console.error('Gagal memuat notifikasi permintaan reset sandi:', error);
      } finally {
        if (isMounted) setLoadedSources((prev) => (prev.reset ? prev : { ...prev, reset: true }));
      }
    };

    fetchResetRequests();
    const intervalId = setInterval(fetchResetRequests, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [canSeeResetNotif]);

  const resetNotifications = resetRequests.map((req) => ({
    id: `reset-${req.id}`,
    text: (
      <>
        Karyawan <strong>{req.employeeName || req.username}</strong> meminta{' '}
        <strong>reset sandi.</strong>
      </>
    ),
    date: req.requestedAt
      ? new Date(req.requestedAt).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : '-',
    type: 'password-reset',
    timestamp: req.requestedAt,
    raw: req,
  }));

  const handleProcessReset = (request) => {
    setSelectedResetNotif(null);
    setShowDropdown(false);
    navigate(`/karyawan?employeeId=${request.employeeId}&resetRequestId=${request.id}`);
  };

  // === NOTIFIKASI "CUTI PERLU DIPROSES" (LEADER / SPV / MANAGER) ===
  useEffect(() => {
    if (!canSeeLeaveApprovalNotif) return;

    let isMounted = true;

    const fetchLeaveApprovalTasks = async () => {
      try {
        // [UBAH] { silent: true } -- badge lonceng, bukan konten utama halaman.
        const data = await getPendingApprovals({ silent: true });
        if (isMounted) setLeaveApprovalTasks(data || []);
      } catch (error) {
        console.error('Gagal memuat notifikasi cuti perlu diproses:', error);
      } finally {
        if (isMounted) setLoadedSources((prev) => (prev.approval ? prev : { ...prev, approval: true }));
      }
    };

    fetchLeaveApprovalTasks();
    const intervalId = setInterval(fetchLeaveApprovalTasks, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [canSeeLeaveApprovalNotif]);

  const leaveApprovalNotifications = leaveApprovalTasks.map((task) => ({
    id: `leave-${task.id}`,
    text: (
      <>
        <strong>{task.karyawan?.nama}</strong> mengajukan{' '}
        <strong>{task.jenisCuti}</strong>, perlu diproses.
      </>
    ),
    date: task.submittedAt
      ? new Date(task.submittedAt).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : '-',
    type: 'leave-approval',
    timestamp: task.submittedAt,
    raw: task,
  }));

  const handleProcessLeaveApproval = (task) => {
    setSelectedLeaveNotif(null);
    setShowDropdown(false);
    navigate(`/ApproveLeave?leaveRequestId=${task.id}`);
  };

  const getNotificationTime = (notification) => {
    const parsedTime = notification.timestamp
      ? new Date(notification.timestamp).getTime()
      : Number.NaN;
    return Number.isNaN(parsedTime)
      ? Number(notification.id.split('-').pop()) || 0
      : parsedTime;
  };

  // [UBAH] holidayNotifications & announcementNotifications dikeluarkan dari
  // daftar gabungan (sudah dihapus di atas) -- sekarang murni cuti + reset sandi.
  const allNotificationCandidates = [
    ...leaveApprovalNotifications,
    ...resetNotifications,
    ...sickNotifications,
    ...notifications,
  ];
  const allNotifications = allNotificationCandidates
    .filter((notification) => !readNotificationIds.includes(notification.id))
    .sort((first, second) => getNotificationTime(second) - getNotificationTime(first));

  // === [BARU] DETEKSI NOTIFIKASI BARU -> LONCENG BERGOYANG + POPUP MINI ===
  useEffect(() => {
    showDropdownRef.current = showDropdown;
  }, [showDropdown]);
  const notificationIdsKey = allNotifications.map((notification) => notification.id).join('|');
  const requiredSourcesLoaded = Boolean(
    loadedSources.cuti
      && (!canSeeResetNotif || loadedSources.reset)
      && loadedSources.sick
      && (!canSeeLeaveApprovalNotif || loadedSources.approval),
  );

  useEffect(() => {
    const seen = seenNotifIdsRef.current;
    const freshNotifications = allNotifications.filter((notification) => !seen.has(notification.id));
    allNotifications.forEach((notification) => seen.add(notification.id));

    // Pemuatan awal (semua sumber) hanya dicatat sebagai "sudah dilihat".
    if (!baselineDoneRef.current) {
      if (requiredSourcesLoaded) baselineDoneRef.current = true;
      return;
    }
    if (freshNotifications.length === 0) return;

    setBellRingTick((tick) => tick + 1);
    // Dropdown sedang terbuka: pengguna sudah melihat daftarnya, cukup goyang lonceng.
    if (showDropdownRef.current) return;
    setBellToast({
      key: Date.now(),
      notification: freshNotifications[0], // allNotifications sudah urut terbaru
      extraCount: freshNotifications.length - 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationIdsKey, requiredSourcesLoaded]);

  // [UBAH] Satu handler terpusat, digerakkan config/notificationRoutes.js:
  // - modal (password-reset, leave-approval): buka modal (perilaku lama, tidak berubah)
  // - navigate (approved, step-approved, returned, rejected, new, sick-*):
  //   tutup dropdown + (opsional) hilangkan notifikasi + pindah halaman TANPA
  //   menunggu apa pun. Tipe yang tidak terdaftar di config diabaikan.
  const handleNotifClick = (notif) => {
    const action = getNotificationAction(notif);
    if (!action) return;

    if (notif.type === 'password-reset') {
      setSelectedResetNotif(notif.raw);
      return;
    }
    if (notif.type === 'leave-approval') {
      setSelectedLeaveNotif(notif.raw);
      return;
    }

    const path = action.getPath?.(notif);
    if (!path) return;

    setShowDropdown(false);
    if (action.dismissOnClick) handleDismissOne(notif.id);
    navigate(path);
  };

  // [BARU] Aksesibilitas keyboard untuk item notifikasi (Enter / Spasi).
  const handleNotifKeyDown = (event, notif) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleNotifClick(notif);
  };

  const handleMarkNotificationsRead = () => {
    const visibleNotificationIds = allNotifications.map((notification) => notification.id);
    const updatedIds = [...new Set([...readNotificationIds, ...visibleNotificationIds])];

    // [UBAH] Baris localStorage.setItem(`${notificationStorageKey}:read-at`, ...)
    // DIHAPUS -- itu sumber bug cutoff-waktu di atas. "Tandai semua dibaca"
    // sekarang murni menandai id-id yang SEDANG tampil (visibleNotificationIds)
    // sebagai sudah dibaca, tidak lagi memblokir apapun berdasarkan waktu.
    localStorage.setItem(notificationStorageKey, JSON.stringify(updatedIds));
    setReadRefreshToken((current) => current + 1);
    setNotifications([]);
  };

  useEffect(() => {
    const formatIndonesiaDate = () => {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const today = new Date().toLocaleDateString('id-ID', options);
      setCurrentDate(today);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    formatIndonesiaDate();
    window.addEventListener('resize', handleResize);
    const timer = setInterval(formatIndonesiaDate, 3600000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getSubHeaderTitle = () => {
    if (isDevAccessPath(location.pathname)) return 'Pengaturan Fitur';

    switch (location.pathname) {
      case '/':
      case '/dashboard': return 'Dashboard Utama';
      case '/ApplyCuti': return 'Formulir Pengajuan Cuti Baru';
      case '/history-cuti': return 'Riwayat & Pelacakan Alur Cuti';
      case '/absensi': return 'Pencatatan Absensi Karyawan';
      case '/karyawan': return 'Manajemen Data Karyawan';
      case '/approval-cuti': return 'Daftar Approval Cuti';
      case '/reject-cuti': return 'Daftar Reject Cuti';
      case '/return-cuti': return 'Daftar Return Cuti';
      default: return 'Management System';
    }
  };

  return (
    <header className="navbar-header">
      {isMobile && (
        <button className="btn-hamburger" onClick={toggleSidebar}>
          <i className="fa-solid fa-bars"></i>
        </button>
      )}
      <div className="navbar-brand">
        <div className="navbar-title-container">
          <span className="badge-sims">SIMS</span>
          <h1 className="navbar-title">SYS Indonesia Management System</h1>
        </div>
        <p className="navbar-subtitle">{getSubHeaderTitle()}</p>
      </div>

      <div className="navbar-actions">
        <span className="navbar-date">{currentDate}</span>

        <div className="notification-container" ref={notificationRef}>
          <button
            ref={bellButtonRef}
            className="btn-notification"
            title="Notifikasi"
            onClick={() => {
              setBellToast(null);
              if (!showDropdown) setNotifRefreshTick((tick) => tick + 1); // [BARU] refresh hanya saat dibuka
              setShowDropdown(!showDropdown);
            }}
          >
            {/* [UBAH] svg dibungkus span.bell-icon + key=bellRingTick: tiap ada notif baru
                elemen dibuat ulang sehingga animasi goyang selalu diputar dari awal. */}
            <span key={`ring-${bellRingTick}`} className={`bell-icon${bellRingTick > 0 ? ' bell-icon--ring' : ''}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </span>
            {bellRingTick > 0 && <span key={`wave-${bellRingTick}`} className="bell-wave" aria-hidden="true" />}
            {allNotifications.length > 0 && (
              <span
                key={`badge-${bellRingTick}`}
                className={`notification-badge${bellRingTick > 0 ? ' notification-badge--pop' : ''}`}
              >
                {allNotifications.length}
              </span>
            )}
          </button>

          {/* [BARU] Popup mini dari lonceng */}
          {bellToast && !showDropdown && (
            <NotifBellToast
              key={bellToast.key}
              notification={bellToast.notification}
              extraCount={bellToast.extraCount}
              anchorRef={bellButtonRef}
              onOpen={() => {
                // [UBAH] Notifikasi tunggal -> langsung ke tujuannya. Kalau ada
                // notifikasi lain (+N) atau tipenya tak dikenal -> buka daftar.
                const target = bellToast.notification;
                const canOpenDirectly = bellToast.extraCount === 0 && getNotificationAction(target);
                setBellToast(null);
                if (canOpenDirectly) {
                  handleNotifClick(target);
                  return;
                }
                setNotifRefreshTick((tick) => tick + 1);
                setShowDropdown(true);
              }}
              onClose={() => setBellToast(null)}
            />
          )}

          {showDropdown && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span className="notification-header-title">Notifikasi Terbaru</span>
                <button className="btn-mark-read" onClick={handleMarkNotificationsRead}>Tandai dibaca</button>
              </div>
              <ul className="notification-list">
                {allNotifications.length === 0 ? (
                  <li className="notification-empty">Tidak ada notifikasi baru</li>
                ) : (
                  allNotifications.map((notif) => {
                    const action = getNotificationAction(notif); // [BARU]
                    return (
                    <li
                      key={notif.id}
                      className={`notification-item${action ? ' notification-item--clickable' : ''}`}
                    >
                      {/* [BARU] Area klik dipisah dari tombol "×" supaya tidak ada
                          tombol di dalam tombol, dan bisa difokus lewat keyboard. */}
                      <div
                        className="notification-item__main"
                        role={action ? 'button' : undefined}
                        tabIndex={action ? 0 : undefined}
                        onClick={action ? () => handleNotifClick(notif) : undefined}
                        onKeyDown={action ? (event) => handleNotifKeyDown(event, notif) : undefined}
                      >
                      <div className="notification-icon-wrapper">
                        {notif.type === 'returned' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" fill="none"/>
                            <path d="M8 12h8M8 12l3-3m-3 3l3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {(notif.type === 'approved' || notif.type === 'sick-approved') && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="none"/>
                            <path d="M8 12l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {notif.type === 'step-approved' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#14b8a6" strokeWidth="2" fill="none"/>
                            <path d="M8 12l3 3 5-5" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {(notif.type === 'rejected' || notif.type === 'sick-rejected') && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" fill="none"/>
                            <path d="M8.5 8.5l7 7m0-7l-7 7" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                        {notif.type === 'new' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none"/>
                            <circle cx="12" cy="12" r="4" fill="#3b82f6"/>
                          </svg>
                        )}
                        {notif.type === 'password-reset' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
                            <circle cx="9" cy="12" r="2.2" stroke="#8b5cf6" strokeWidth="1.8" fill="none"/>
                            <path d="M11 12h5m0 0v2m0-2v-2" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        )}
                        {notif.type === 'leave-approval' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="18" height="17" rx="2" stroke="#0284c7" strokeWidth="2"/>
                            <path d="M3 9h18M8 2v4M16 2v4" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="14.5" r="1.6" fill="#0284c7"/>
                          </svg>
                        )}
                      </div>

                      <div className="notification-content">
                        <p className="notification-text">{notif.text}</p>
                        <span className="notification-time">{notif.date}</span>
                        {/* [UBAH] 4 blok hint terpisah (inline style warna) diganti satu
                            baris berbasis config/notificationRoutes.js */}
                        {action && (
                          <span className={`notification-action-hint notification-action-hint--${action.tone}`}>
                            {action.hint}
                          </span>
                        )}
                      </div>
                      </div>{/* /notification-item__main */}

                      <button
                        type="button"
                        className="notification-dismiss-btn"
                        aria-label="Hapus notifikasi"
                        title="Hapus notifikasi"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissOne(notif.id);
                        }}
                      >
                        &times;
                      </button>
                    </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>

      </div>

      <NotifPasswordResetModal
        request={selectedResetNotif}
        onClose={() => setSelectedResetNotif(null)}
        onProcess={handleProcessReset}
      />

      <NotifLeaveApprovalModal
        request={selectedLeaveNotif}
        onClose={() => setSelectedLeaveNotif(null)}
        onProcess={handleProcessLeaveApproval}
      />
    </header>
  );
}