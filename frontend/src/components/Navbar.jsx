import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRiwayatByUser, getPendingApprovals } from '../services/CutiService'; // TAMBAHAN: Mengambil fungsi hit database service yang sama dengan ApplyCuti
// [BARU] Untuk notifikasi permintaan reset sandi (lonceng HR Admin/Super Admin)
import { getPendingResetRequests } from '../services/passwordResetService';
import { getAnnouncements } from '../services/announcementService';
import { getAllHolidays } from '../services/holidayService';
import { isHrAdmin, isSuperAdmin, isManagerOrSpv } from '../utils/roles';
import NotifPasswordResetModal from './NotifPasswordResetModal';
import NotifLeaveApprovalModal from './NotifLeaveApprovalModal'; // [BARU]
import './Navbar.css'; 

// Tambahkan parameter object user untuk mengambil id data dari database/API
export default function Navbar({ toggleSidebar, user }) {
  const location = useLocation();
  const navigate = useNavigate(); // [BARU] untuk redirect ke /karyawan saat notif reset diproses
  const [currentDate, setCurrentDate] = useState('');
  
  // === BAGIAN TAMBAHAN NOTIFIKASI REAL-TIME DARI DATABASE (START) ===
  const [showDropdown, setShowDropdown] = useState(false);
  const notificationRef = useRef(null); // [BARU] Ref pembungkus lonceng + panel dropdown, dipakai untuk deteksi klik di luar

  // [BARU] Auto-tutup dropdown notifikasi saat pengguna klik di area manapun di luar lonceng/panelnya
  // (pola sama persis dengan FilterStatusDropdown.jsx agar konsisten satu aplikasi)
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
  const [announcementNotifications, setAnnouncementNotifications] = useState([]);
  const [holidayNotifications, setHolidayNotifications] = useState([]);

  // [BARU] Notifikasi permintaan reset sandi -- terpisah dari notifikasi cuti
  // di atas karena sumber datanya beda (tabel password_reset_requests, bukan
  // riwayat cuti) dan hanya relevan untuk HR Admin / Super Admin.
  const [resetRequests, setResetRequests] = useState([]);
  const [selectedResetNotif, setSelectedResetNotif] = useState(null);
  const canSeeResetNotif = isHrAdmin(user) || isSuperAdmin(user);

  // [BARU] Notifikasi "ada cuti perlu diproses" -- ditujukan ke approver
  // (Leader/SPV/Manager) yang DIPILIH SPESIFIK oleh pemohon saat submit cuti
  // (lihat leaderEmployeeId/spvEmployeeId/managerEmployeeId di CutiService.js).
  // Sumber data: /api/cuti/approvals/my-task, yang backend-nya SUDAH otomatis
  // scoped ke employeeId approver yang sedang login -- jadi kalau Leader A,
  // SPV B, Manager C dipilih di satu pengajuan, masing-masing akan melihat
  // notifikasi ini di lonceng akun mereka sendiri saat login.
  const [leaveApprovalTasks, setLeaveApprovalTasks] = useState([]);
  const [selectedLeaveNotif, setSelectedLeaveNotif] = useState(null);
  const canSeeLeaveApprovalNotif = isManagerOrSpv(user); // true utk Leader, SPV, & Manager

  // State tambahan untuk mendeteksi layar handphone (mobile)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Normalisasi data user role
  const userRole = (user?.jabatan || user?.role || 'Karyawan').toLowerCase();
  // Data login yang diteruskan App berisi name/username, bukan employee id.
  // Gunakan identitas ini agar fetch notifikasi tidak salah dianggap sebagai guest.
  const notificationOwner = user?.username || user?.name || user?.nama || 'guest';
  const notificationStorageKey = `read-leave-status-notifications:${notificationOwner}`;
  const [readRefreshToken, setReadRefreshToken] = useState(0);
  const readNotificationIds = (() => {
    // Token berubah setelah tombol dibaca ditekan, sehingga storage dibaca ulang.
    void readRefreshToken;
    try {
      const savedIds = JSON.parse(localStorage.getItem(notificationStorageKey) || '[]');
      return Array.isArray(savedIds) ? savedIds : [];
    } catch {
      return [];
    }
  })();
  const lastNotificationReadAt = Number(
    localStorage.getItem(`${notificationStorageKey}:read-at`) || 0
  );

  useEffect(() => {
    if (notificationOwner === 'guest') return undefined;

    let isMounted = true;

    const fetchNotificationFromDB = async () => {
      try {
        // Ambil data riwayat cuti dari API/Database
        const rawData = await getRiwayatByUser();

        const mappedNotifications = [];

        (rawData || []).forEach((item) => {
          const statusBerkas = item.status ? item.status.toLowerCase() : 'proses';
          const jenisCutiNama = item.rawDetail?.jenisCuti || item.jenisCuti || 'Cuti tahunan';
          const stringTanggal = item.stringTanggal || 'Tanggal tidak tersedia';
          const pemohon = item.userName || 'Karyawan';

          // Endpoint /api/cuti/me sudah dibatasi backend hanya untuk pemohon
          // yang sedang login, sehingga semua item di sini adalah milik user ini.
          if (statusBerkas.includes('kembali') || statusBerkas.includes('return')) {
            const notificationId = `ret-${item.id}`;
            mappedNotifications.push({
              id: notificationId,
              text: <>Pengajuan <strong>{jenisCutiNama}</strong> Anda telah <strong>dikembalikan.</strong></>,
              date: stringTanggal,
              timestamp: item.statusChangedAt,
              type: "returned"
            });
          } else if (statusBerkas.includes('setuju') || statusBerkas.includes('acc')) {
            const notificationId = `app-${item.id}`;
            mappedNotifications.push({
              id: notificationId,
              text: <>Pengajuan <strong>{jenisCutiNama}</strong> Anda telah <strong>disetujui.</strong></>,
              date: stringTanggal,
              timestamp: item.statusChangedAt,
              type: "approved"
            });
          } else if (statusBerkas.includes('tolak') || statusBerkas.includes('reject')) {
            const notificationId = `rej-${item.id}`;
            mappedNotifications.push({
              id: notificationId,
              text: <>Pengajuan <strong>{jenisCutiNama}</strong> Anda telah <strong>ditolak.</strong></>,
              date: stringTanggal,
              timestamp: item.statusChangedAt,
              type: "rejected"
            });
          }

          // 2. Logika untuk Atasan (Leader, SPV, Manager menerima notifikasi adanya pengajuan baru masuk)
          const isAtasanLeader = userRole.includes('leader') && item.rawDetail?.leader?.status?.toLowerCase() === 'pending';
          const isAtasanSPV = userRole.includes('spv') && item.rawDetail?.spv?.status?.toLowerCase() === 'pending';
          const isAtasanManager = userRole.includes('manager') && item.rawDetail?.manager?.status?.toLowerCase() === 'pending';

          if (isAtasanLeader || isAtasanSPV || isAtasanManager) {
            mappedNotifications.push({
              id: `new-${item.id}`,
              text: <>Ada pengajuan <strong>{jenisCutiNama}</strong> baru dari Karyawan ({pemohon}) menunggu persetujuan Anda.</>,
              date: stringTanggal,
              type: "new"
            });
          }
        });

        if (isMounted) setNotifications(mappedNotifications);
      } catch (error) {
        console.error("Gagal memuat data notifikasi dari API:", error);
      }
    };

    fetchNotificationFromDB();
    const intervalId = window.setInterval(fetchNotificationFromDB, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [notificationOwner, notificationStorageKey, userRole, showDropdown]);
  // === BAGIAN TAMBAHAN NOTIFIKASI REAL-TIME DARI DATABASE (END) ===

  // Pengumuman/portal berita dan penambahan hari libur tersedia untuk semua
  // akun yang sudah login dan memakai aturan baca lonceng yang sama.
  useEffect(() => {
    if (notificationOwner === 'guest') return undefined;

    let isMounted = true;
    const fetchCompanyInformation = async () => {
      const [announcementsResult, holidaysResult] = await Promise.allSettled([
        getAnnouncements(),
        getAllHolidays(),
      ]);

      if (!isMounted) return;

      if (announcementsResult.status === 'fulfilled') {
        setAnnouncementNotifications((announcementsResult.value || []).map((item) => {
          const timestamp = item.updatedAt || item.createdAt;
          return {
            id: `news-${item.id}-${timestamp ? new Date(timestamp).getTime() : item.id}`,
            text: <><strong>Pengumuman/berita baru:</strong> {item.judul}</>,
            date: timestamp
              ? new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
              : '-',
            timestamp,
            type: 'announcement',
          };
        }));
      }

      if (holidaysResult.status === 'fulfilled') {
        setHolidayNotifications((holidaysResult.value || []).map((item) => ({
          id: `holiday-${item.holidayId}`,
          text: <><strong>Hari libur baru:</strong> {item.name}</>,
          date: item.date
            ? new Date(`${item.date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : '-',
          timestamp: item.createdAt,
          type: 'holiday',
        })));
      }
    };

    fetchCompanyInformation();
    const intervalId = window.setInterval(fetchCompanyInformation, 30000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [notificationOwner]);

  // === [BARU] NOTIFIKASI PERMINTAAN RESET SANDI (HR ADMIN / SUPER ADMIN) ===
  useEffect(() => {
    if (!canSeeResetNotif) return;

    let isMounted = true;

    const fetchResetRequests = async () => {
      try {
        const data = await getPendingResetRequests();
        if (isMounted) setResetRequests(data || []);
      } catch (error) {
        console.error('Gagal memuat notifikasi permintaan reset sandi:', error);
      }
    };

    fetchResetRequests();
    // Polling ringan tiap 30 detik supaya badge lonceng ikut update tanpa
    // HR harus buka-tutup dropdown-nya sendiri.
    const intervalId = setInterval(fetchResetRequests, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [canSeeResetNotif]);

  // Notifikasi reset sandi diubah ke bentuk yang sama dengan `notifications`
  // (cuti) supaya bisa dirender dalam satu daftar & satu badge jumlah.
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
    // Arahkan ke halaman Karyawan sambil bawa employeeId & resetRequestId
    // lewat query string -- Karyawan.jsx yang akan otomatis membuka modal
    // edit untuk karyawan bersangkutan (lihat Karyawan.jsx).
    navigate(`/karyawan?employeeId=${request.employeeId}&resetRequestId=${request.id}`);
  };
  // === [BARU] AKHIR BAGIAN NOTIFIKASI RESET SANDI ===

  // === [BARU] NOTIFIKASI "CUTI PERLU DIPROSES" (LEADER / SPV / MANAGER) ===
  useEffect(() => {
    if (!canSeeLeaveApprovalNotif) return;

    let isMounted = true;

    const fetchLeaveApprovalTasks = async () => {
      try {
        const data = await getPendingApprovals();
        if (isMounted) setLeaveApprovalTasks(data || []);
      } catch (error) {
        console.error('Gagal memuat notifikasi cuti perlu diproses:', error);
      }
    };

    fetchLeaveApprovalTasks();
    // Polling ringan tiap 30 detik, sama seperti notifikasi reset sandi.
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
    // Arahkan ke halaman Approve Cuti sambil bawa leaveRequestId lewat query
    // string -- ApproveLeave.jsx yang akan otomatis membuka detail
    // pengajuan cuti yang bersangkutan (lihat ApproveLeave.jsx).
    navigate(`/ApproveLeave?leaveRequestId=${task.id}`);
  };
  // === [BARU] AKHIR BAGIAN NOTIFIKASI CUTI PERLU DIPROSES ===

  // Semua event setelah waktu terakhir dibaca tetap ditampilkan dan dihitung.
  // Jadi badge bertambah 1, 2, 3, ... sampai pengguna menandai semuanya dibaca.
  const getNotificationTime = (notification) => {
    const parsedTime = notification.timestamp
      ? new Date(notification.timestamp).getTime()
      : Number.NaN;
    return Number.isNaN(parsedTime)
      ? Number(notification.id.split('-').pop()) || 0
      : parsedTime;
  };
  const allNotificationCandidates = [
    ...announcementNotifications,
    ...holidayNotifications,
    ...leaveApprovalNotifications,
    ...resetNotifications,
    ...notifications,
  ];
  const allNotifications = allNotificationCandidates
    .filter((notification) => (
      !readNotificationIds.includes(notification.id)
      && getNotificationTime(notification) > lastNotificationReadAt
    ))
    .sort((first, second) => getNotificationTime(second) - getNotificationTime(first));

  const handleNotifClick = (notif) => {
    if (notif.type === 'password-reset') {
      setSelectedResetNotif(notif.raw);
    } else if (notif.type === 'leave-approval') {
      setSelectedLeaveNotif(notif.raw);
    }
  };

  const handleMarkNotificationsRead = () => {
    const visibleNotificationIds = allNotifications.map((notification) => notification.id);
    const updatedIds = [...new Set([...readNotificationIds, ...visibleNotificationIds])];

    localStorage.setItem(notificationStorageKey, JSON.stringify(updatedIds));
    localStorage.setItem(`${notificationStorageKey}:read-at`, String(Date.now()));
    setReadRefreshToken((current) => current + 1);
    setNotifications([]);
  };

  // Effect untuk meng-update tanggal secara otomatis dalam format Indonesia & Deteksi ukuran layar
  useEffect(() => {
    const formatIndonesiaDate = () => {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const today = new Date().toLocaleDateString('id-ID', options);
      setCurrentDate(today);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // Batas ukuran handphone, bisa diganti sesuai kebutuhan (misal 480 atau 768)
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
      {/* DIEDIT: Tombol Hamburger hanya dirender jika diakses melalui handphone/mobile (lebar layar <= 768px) */}
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
            className="btn-notification" 
            title="Notifikasi"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {allNotifications.length > 0 && (
              <span className="notification-badge">{allNotifications.length}</span>
            )}
          </button>

          {/* DROPDOWN PANEL NOTIFIKASI DISESUAIKAN PERSIS SEPERTI GAMBAR */}
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
                  allNotifications.map(notif => (
                    <li
                      key={notif.id}
                      className="notification-item"
                      onClick={() => handleNotifClick(notif)}
                      style={['password-reset', 'leave-approval'].includes(notif.type) ? { cursor: 'pointer' } : undefined}
                    >
                      <div className="notification-icon-wrapper">
                        {notif.type === 'returned' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-returned">
                            <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" fill="none"/>
                            <path d="M8 12h8M8 12l3-3m-3 3l3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {notif.type === 'approved' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-approved">
                            <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="none"/>
                            <path d="M8 12l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {notif.type === 'rejected' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-rejected">
                            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" fill="none"/>
                            <path d="M8.5 8.5l7 7m0-7l-7 7" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                        {notif.type === 'new' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-new">
                            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none"/>
                            <circle cx="12" cy="12" r="4" fill="#3b82f6"/>
                          </svg>
                        )}
                        {/* [BARU] Ikon khusus notifikasi permintaan reset sandi */}
                        {notif.type === 'password-reset' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-password-reset">
                            <circle cx="12" cy="12" r="10" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
                            <circle cx="9" cy="12" r="2.2" stroke="#8b5cf6" strokeWidth="1.8" fill="none"/>
                            <path d="M11 12h5m0 0v2m0-2v-2" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        )}
                        {/* [BARU] Ikon khusus notifikasi cuti perlu diproses */}
                        {notif.type === 'leave-approval' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-leave-approval">
                            <rect x="3" y="4" width="18" height="17" rx="2" stroke="#0284c7" strokeWidth="2"/>
                            <path d="M3 9h18M8 2v4M16 2v4" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="14.5" r="1.6" fill="#0284c7"/>
                          </svg>
                        )}
                        {notif.type === 'announcement' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-announcement">
                            <path d="M4 11v2a2 2 0 0 0 2 2h2l2 4h3l-2-4 7-3V6l-10 4H6a2 2 0 0 0-2 1Z" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>
                            <path d="M18 8.5c1 .5 1 2.5 0 3" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                        {notif.type === 'holiday' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-holiday">
                            <rect x="3" y="5" width="18" height="16" rx="2" stroke="#f97316" strokeWidth="2"/>
                            <path d="M3 10h18M8 3v4M16 3v4" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                            <path d="m9 15 2 2 4-4" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      <div className="notification-content">
                        <p className="notification-text">{notif.text}</p>
                        <span className="notification-time">{notif.date}</span>
                        {notif.type === 'password-reset' && (
                          <span className="notification-action-hint">Klik untuk memproses →</span>
                        )}
                        {notif.type === 'leave-approval' && (
                          <span className="notification-action-hint notification-action-hint_leave">Klik untuk memproses →</span>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* [BARU] Modal detail notifikasi permintaan reset sandi */}
      <NotifPasswordResetModal
        request={selectedResetNotif}
        onClose={() => setSelectedResetNotif(null)}
        onProcess={handleProcessReset}
      />

      {/* [BARU] Modal detail notifikasi cuti perlu diproses */}
      <NotifLeaveApprovalModal
        request={selectedLeaveNotif}
        onClose={() => setSelectedLeaveNotif(null)}
        onProcess={handleProcessLeaveApproval}
      />
    </header>
  );
}