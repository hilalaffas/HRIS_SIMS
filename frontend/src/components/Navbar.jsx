import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRiwayatByUser, getPendingApprovals, getMyApprovalUpdates } from '../services/CutiService';
import { getPendingResetRequests } from '../services/passwordResetService';
import { getAnnouncements } from '../services/announcementService';
import { isHrAdmin, isSuperAdmin, isManagerOrSpv } from '../utils/roles';
import NotifPasswordResetModal from './NotifPasswordResetModal';
import NotifLeaveApprovalModal from './NotifLeaveApprovalModal';
import './Navbar.css';

const APPROVER_ROLE_LABELS = {
  LEADER: 'Leader',
  SPV: 'SPV',
  MANAGER: 'Manager',
};

// [BARU] Notifikasi yang mengarahkan ke suatu tempat saat diklik.
// Reset password & cuti-perlu-diproses tetap membuka modal seperti sebelumnya;
// berita & cuti disetujui sekarang juga ikut "clickable" (baru).
const CLICKABLE_TYPES = ['password-reset', 'leave-approval', 'announcement', 'approved'];

export default function Navbar({ toggleSidebar, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState('');

  const [showDropdown, setShowDropdown] = useState(false);
  const notificationRef = useRef(null);

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
  // [UBAH] holidayNotifications DIHAPUS TOTAL -- notifikasi hari libur
  // sudah tidak lagi bagian dari lonceng notifikasi. Hanya cuti & berita.
  const [announcementNotifications, setAnnouncementNotifications] = useState([]);

  const [resetRequests, setResetRequests] = useState([]);
  const [selectedResetNotif, setSelectedResetNotif] = useState(null);
  const canSeeResetNotif = isHrAdmin(user) || isSuperAdmin(user);

  const [leaveApprovalTasks, setLeaveApprovalTasks] = useState([]);
  const [selectedLeaveNotif, setSelectedLeaveNotif] = useState(null);
  const canSeeLeaveApprovalNotif = isManagerOrSpv(user);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const userRole = (user?.jabatan || user?.role || 'Karyawan').toLowerCase();
  const notificationOwner = user?.username || user?.name || user?.nama || 'guest';
  const notificationStorageKey = `read-leave-status-notifications:${notificationOwner}`;
  const [readRefreshToken, setReadRefreshToken] = useState(0);

  const readNotificationIds = (() => {
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
    if (notificationOwner === 'guest') return undefined;

    let isMounted = true;

    const fetchNotificationFromDB = async () => {
      const [riwayatResult, stepUpdatesResult] = await Promise.allSettled([
        getRiwayatByUser(),
        getMyApprovalUpdates(),
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

      if (isMounted) setNotifications(mappedNotifications);
    };

    fetchNotificationFromDB();
    const intervalId = window.setInterval(fetchNotificationFromDB, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [notificationOwner, notificationStorageKey, userRole, showDropdown]);

  // === NOTIFIKASI BERITA / PENGUMUMAN ===
  // [UBAH] Sebelumnya fetchCompanyInformation() mengambil pengumuman DAN hari
  // libur sekaligus (Promise.allSettled 2 sumber). Sekarang HANYA pengumuman;
  // seluruh logic hari libur (getAllHolidays, holidayNotifications, ikon
  // 'holiday') telah dihapus.
  useEffect(() => {
    if (notificationOwner === 'guest') return undefined;

    let isMounted = true;
    const fetchAnnouncements = async () => {
      try {
        const items = await getAnnouncements();
        if (!isMounted) return;
        setAnnouncementNotifications((items || []).map((item) => {
          const timestamp = item.updatedAt || item.createdAt;
          return {
            id: `news-${item.id}-${timestamp ? new Date(timestamp).getTime() : item.id}`,
            text: <><strong>Pengumuman/berita baru:</strong> {item.judul}</>,
            date: timestamp
              ? new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
              : '-',
            timestamp,
            type: 'announcement',
            raw: item,
          };
        }));
      } catch (error) {
        console.error('Gagal memuat notifikasi berita:', error);
      }
    };

    fetchAnnouncements();
    const intervalId = window.setInterval(fetchAnnouncements, 30000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [notificationOwner]);

  // === NOTIFIKASI PERMINTAAN RESET SANDI (HR ADMIN / SUPER ADMIN) ===
  // Tidak berubah: Super Admin & HR Admin sama-sama melihat notifikasi ini.
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
        const data = await getPendingApprovals();
        if (isMounted) setLeaveApprovalTasks(data || []);
      } catch (error) {
        console.error('Gagal memuat notifikasi cuti perlu diproses:', error);
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

  // [UBAH] holidayNotifications dikeluarkan dari daftar gabungan (sudah dihapus di atas)
  const allNotificationCandidates = [
    ...announcementNotifications,
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

  // [BARU] Satu handler terpusat untuk semua jenis klik notifikasi:
  // - password-reset & leave-approval: buka modal (perilaku lama, tidak berubah)
  // - announcement: hilangkan notifikasi + arahkan ke Dashboard (tempat berita tampil)
  // - approved: hilangkan notifikasi + arahkan ke ApplyCuti dengan leaveRequestId,
  //   supaya ApplyCuti.jsx otomatis membuka modal detail cuti tsb.
  const handleNotifClick = (notif) => {
    if (notif.type === 'password-reset') {
      setSelectedResetNotif(notif.raw);
      return;
    }
    if (notif.type === 'leave-approval') {
      setSelectedLeaveNotif(notif.raw);
      return;
    }
    if (notif.type === 'announcement') {
      handleDismissOne(notif.id);
      setShowDropdown(false);
      navigate('/dashboard');
      return;
    }
    if (notif.type === 'approved' && notif.raw?.id) {
      handleDismissOne(notif.id);
      setShowDropdown(false);
      navigate(`/ApplyCuti?leaveRequestId=${notif.raw.id}`);
      return;
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
                      style={CLICKABLE_TYPES.includes(notif.type) ? { cursor: 'pointer' } : undefined}
                    >
                      <div className="notification-icon-wrapper">
                        {notif.type === 'returned' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" fill="none"/>
                            <path d="M8 12h8M8 12l3-3m-3 3l3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {notif.type === 'approved' && (
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
                        {notif.type === 'rejected' && (
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
                        {notif.type === 'announcement' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M4 11v2a2 2 0 0 0 2 2h2l2 4h3l-2-4 7-3V6l-10 4H6a2 2 0 0 0-2 1Z" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>
                            <path d="M18 8.5c1 .5 1 2.5 0 3" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
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
                        {notif.type === 'announcement' && (
                          <span className="notification-action-hint" style={{ color: '#7c3aed' }}>Klik untuk membuka →</span>
                        )}
                        {notif.type === 'approved' && (
                          <span className="notification-action-hint" style={{ color: '#10b981' }}>Klik untuk lihat detail →</span>
                        )}
                      </div>

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
                  ))
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